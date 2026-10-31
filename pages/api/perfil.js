import { authorize } from "../../lib/server";
import { hydrateProfile } from "../../lib/normalized";
import { validateProfile } from "../../lib/validation.mjs";
const fields =
  "id,carrera_id,nombre,apellido,carrera,anio_carrera,areas_interes,disponibilidad_horaria,horas_semanales,modalidad_preferida,skills,idiomas,experiencia_resumen,cv_path";
export default async function handler(req, res) {
  if (!["GET", "PUT"].includes(req.method)) {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Método no permitido." });
  }
  try {
    const auth = await authorize(req, res);
    if (!auth) return;
    const { client, user } = auth;
    if (req.method === "GET") {
      const { data, error } = await client
        .from("perfiles_estudiantes")
        .select(fields)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error)
        return res
          .status(502)
          .json({ error: "No se pudo cargar tu perfil. Intentá nuevamente." });
      return res.json({ profile: await hydrateProfile(client, data) });
    }
    let profile;
    try {
      profile = validateProfile(req.body);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const { data, error } = await client
      .from("perfiles_estudiantes")
      .upsert(
        {
          ...profile,
          user_id: user.id,
          fecha_actualizacion: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select(fields)
      .single();
    if (error)
      return res
        .status(502)
        .json({
          error:
            "No se pudo guardar tu perfil. Tus cambios siguen en el formulario.",
        });
    return res.json({ profile: await hydrateProfile(client, data) });
  } catch {
    return res
      .status(502)
      .json({ error: "No se pudo conectar. Intentá nuevamente." });
  }
}
export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };
