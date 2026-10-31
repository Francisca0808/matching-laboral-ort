import { authorize } from "../../lib/server";
import { extractCvText } from "../../lib/cv/extract.mjs";
import { analyzeCvText } from "../../lib/cv/analyze.mjs";
import { loadCvCatalog } from "../../lib/cv/normalize.mjs";

const friendlyFailure =
  "No pudimos analizar automáticamente este CV. Podés completar tu perfil manualmente.";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  const auth = await authorize(req, res);
  if (!auth) return;
  const { data: profile, error: profileError } = await auth.client
    .from("perfiles_estudiantes")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (profileError || !profile)
    return res.status(404).json({ error: "Primero subí tu CV." });
  const { data: document, error: documentError } = await auth.client
    .from("documentos_estudiante")
    .select(
      "id,bucket_id,object_path,mime_type,analisis_estado,analisis_resultado,analisis_modelo,analisis_fecha",
    )
    .eq("perfil_id", profile.id)
    .eq("tipo", "cv")
    .eq("es_actual", true)
    .maybeSingle();
  if (documentError || !document)
    return res.status(404).json({ error: "Primero subí tu CV." });
  if (req.method === "GET")
    return res.json({
      estado: document.analisis_estado,
      sugerencias: document.analisis_resultado,
      modelo: document.analisis_modelo,
      fecha: document.analisis_fecha,
    });

  await auth.client
    .from("documentos_estudiante")
    .update({
      analisis_estado: "procesando",
      analisis_error: null,
      analisis_resultado: null,
    })
    .eq("id", document.id);
  try {
    const { data: blob, error: downloadError } = await auth.client.storage
      .from(document.bucket_id)
      .download(document.object_path);
    if (downloadError || !blob)
      throw new Error("No se pudo leer el documento guardado.");
    const buffer = Buffer.from(await blob.arrayBuffer());
    const text = await extractCvText(buffer, document.mime_type);
    const catalog = await loadCvCatalog(auth.client);
    const { data: normalized, model } = await analyzeCvText(text, { catalog });
    const timestamp = new Date().toISOString();
    const update = await auth.client
      .from("documentos_estudiante")
      .update({
        analisis_estado: "completado",
        analisis_resultado: normalized,
        analisis_modelo: model,
        analisis_fecha: timestamp,
        analisis_error: null,
      })
      .eq("id", document.id);
    if (update.error) throw update.error;
    return res.json({
      estado: "completado",
      sugerencias: normalized,
      modelo: model,
      fecha: timestamp,
    });
  } catch (error) {
    await auth.client
      .from("documentos_estudiante")
      .update({
        analisis_estado: "fallido",
        analisis_error: "analisis_fallido",
        analisis_resultado: null,
        analisis_fecha: new Date().toISOString(),
      })
      .eq("id", document.id);
    return res.status(422).json({ error: friendlyFailure });
  }
}

export const config = {
  maxDuration: 60,
  api: { bodyParser: { sizeLimit: "1kb" } },
};
