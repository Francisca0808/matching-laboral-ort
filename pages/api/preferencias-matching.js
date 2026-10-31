import { authorize } from "../../lib/server";
import {
  matchingPreferences,
  preferencesToRow,
  validateWeightInput,
} from "../../lib/matching-weights.mjs";

const fields =
  "peso_skills,peso_areas,peso_carrera,peso_modalidad,peso_jornada,peso_horario,peso_salario,salario_minimo_deseado,moneda_preferida,periodicidad_preferida,fecha_actualizacion";

export default async function handler(req, res) {
  if (!["GET", "PUT", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, PUT, DELETE");
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
    return res.status(404).json({ error: "Primero guardá tu perfil." });

  if (req.method === "GET") {
    const { data, error } = await auth.client
      .from("preferencias_matching")
      .select(fields)
      .eq("perfil_id", profile.id)
      .maybeSingle();
    if (error)
      return res.status(502).json({ error: "No se pudieron cargar tus preferencias." });
    return res.json({ preferences: matchingPreferences(data) });
  }

  if (req.method === "DELETE") {
    const { error } = await auth.client
      .from("preferencias_matching")
      .delete()
      .eq("perfil_id", profile.id);
    if (error)
      return res.status(502).json({ error: "No se pudieron restablecer los pesos." });
    return res.json({ preferences: matchingPreferences(null) });
  }

  let weights;
  try {
    weights = validateWeightInput({ ...req.body?.weights, salario: 0 });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  const { data, error } = await auth.client
    .from("preferencias_matching")
    .upsert(
      {
        perfil_id: profile.id,
        ...preferencesToRow(weights),
        peso_salario: 0,
        salario_minimo_deseado: null,
        moneda_preferida: null,
        periodicidad_preferida: null,
        fecha_actualizacion: new Date().toISOString(),
      },
      { onConflict: "perfil_id" },
    )
    .select(fields)
    .single();
  if (error)
    return res.status(502).json({ error: "No se pudieron guardar tus preferencias." });
  return res.json({ preferences: matchingPreferences(data) });
}

export const config = { api: { bodyParser: { sizeLimit: "4kb" } } };
