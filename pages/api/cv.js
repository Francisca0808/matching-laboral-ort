import { authorize } from "../../lib/server";

export const config = { api: { bodyParser: false } };

const types = {
  "application/pdf": { extension: "pdf", signature: "%PDF-" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extension: "docx",
    signature: "PK",
  },
};

export default async function handler(req, res) {
  if (!["GET", "PUT"].includes(req.method))
    return res.status(405).json({ error: "Método no permitido." });
  try {
    const auth = await authorize(req, res);
    if (!auth) return;
    const { data: profile } = await auth.client
      .from("perfiles_estudiantes")
      .select("id,cv_path")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    const { data: current } = profile?.id
      ? await auth.client
          .from("documentos_estudiante")
          .select("id,object_path,mime_type")
          .eq("perfil_id", profile.id)
          .eq("tipo", "cv")
          .eq("es_actual", true)
          .maybeSingle()
      : { data: null };
    if (req.method === "GET") {
      const storedPath = current?.object_path || profile?.cv_path;
      if (!storedPath)
        return res.status(404).json({ error: "No hay un CV disponible." });
      const { data, error } = await auth.client.storage
        .from("cvs")
        .createSignedUrl(storedPath, 60);
      if (error)
        return res.status(404).json({ error: "No hay un CV disponible." });
      return res.json({ url: data.signedUrl });
    }

    const mimeType = req.headers["content-type"]?.split(";")[0];
    const type = types[mimeType];
    if (!type)
      return res.status(400).json({ error: "Seleccioná un archivo PDF o DOCX." });
    const limit = 4 * 1024 * 1024;
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit)
        return res.status(413).json({ error: "El CV debe pesar hasta 4 MB." });
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (
      size < 5 ||
      !buffer
        .subarray(0, type.signature.length)
        .toString()
        .startsWith(type.signature)
    )
      return res.status(400).json({ error: "El archivo no tiene un formato válido." });
    const path = `${auth.user.id}/cv.${type.extension}`;
    const upload = await auth.client.storage.from("cvs").upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
      cacheControl: "0",
    });
    if (upload.error) throw upload.error;
    const { data: savedProfile, error: profileError } = await auth.client
      .from("perfiles_estudiantes")
      .upsert(
        {
          user_id: auth.user.id,
          cv_path: path,
          fecha_actualizacion: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();
    if (profileError)
      return res.status(502).json({
        error:
          "Se subió el archivo, pero no se guardó la referencia. Reintentá la carga.",
      });
    const retired = await auth.client
      .from("documentos_estudiante")
      .update({ es_actual: false })
      .eq("perfil_id", savedProfile.id)
      .eq("tipo", "cv")
      .eq("es_actual", true);
    if (retired.error) throw retired.error;
    const originalHeader = String(
      req.headers["x-file-name"] || `cv.${type.extension}`,
    );
    let originalName;
    try {
      originalName = decodeURIComponent(originalHeader).slice(0, 255);
    } catch {
      originalName = `cv.${type.extension}`;
    }
    const { data: document, error: documentError } = await auth.client
      .from("documentos_estudiante")
      .upsert(
        {
          perfil_id: savedProfile.id,
          tipo: "cv",
          bucket_id: "cvs",
          object_path: path,
          nombre_original: originalName,
          mime_type: mimeType,
          bytes: size,
          es_actual: true,
          fecha_carga: new Date().toISOString(),
          analisis_estado: "pendiente",
          analisis_resultado: null,
          analisis_modelo: null,
          analisis_fecha: null,
          analisis_error: null,
        },
        { onConflict: "perfil_id,tipo,bucket_id,object_path" },
      )
      .select("id")
      .single();
    if (documentError) throw documentError;
    if (current?.object_path && current.object_path !== path)
      await auth.client.storage.from("cvs").remove([current.object_path]);
    return res.json({ cv_path: path, document_id: document.id });
  } catch {
    return res
      .status(502)
      .json({ error: "No se pudo procesar el CV. Intentá nuevamente." });
  }
}
