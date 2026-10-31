import { matchingPreferences } from "./matching-weights.mjs";

function add(map, key, value) {
  if (!value) return;
  const values = map.get(String(key)) || [];
  if (!values.includes(value)) values.push(value);
  map.set(String(key), values);
}

function relationMap(rows, relation) {
  const map = new Map();
  for (const row of rows || []) add(map, row.oferta_id, row[relation]?.nombre);
  return map;
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function canonicalValues(rawValues, aliases, relation) {
  const map = new Map(
    (aliases || []).map((row) => [
      normalize(row.alias_normalizado),
      row[relation]?.nombre,
    ]),
  );
  return [...new Set((rawValues || []).map((value) => map.get(normalize(value)) || value))];
}

export async function hydrateOffers(client, offers) {
  if (!offers?.length) return offers || [];
  const ids = offers.map((offer) => offer.id);
  const results = await Promise.all([
    client
      .from("oferta_facultades")
      .select("oferta_id,facultad:facultades(nombre)")
      .in("oferta_id", ids),
    client
      .from("oferta_areas_interes")
      .select("oferta_id,area:areas_interes(nombre)")
      .in("oferta_id", ids),
    client
      .from("oferta_skills")
      .select("oferta_id,skill:skills(nombre)")
      .eq("requerida", true)
      .in("oferta_id", ids),
    client
      .from("oferta_idiomas")
      .select("oferta_id,idioma:idiomas(nombre)")
      .eq("requerido", true)
      .in("oferta_id", ids),
    client
      .from("oferta_carreras")
      .select("oferta_id,carrera:carreras(nombre)")
      .in("oferta_id", ids),
    client
      .from("canales_postulacion")
      .select("oferta_id,tipo,email,asunto,url,instrucciones,origen,verificado")
      .in("oferta_id", ids),
  ]);
  if (results.some((result) => result.error))
    throw new Error("No se pudieron cargar las relaciones normalizadas.");

  const faculties = relationMap(results[0].data, "facultad");
  const areas = relationMap(results[1].data, "area");
  const skills = relationMap(results[2].data, "skill");
  const languages = relationMap(results[3].data, "idioma");
  const careers = relationMap(results[4].data, "carrera");
  const channels = new Map();
  for (const row of results[5].data || []) {
    const values = channels.get(String(row.oferta_id)) || [];
    values.push({
      tipo: row.tipo,
      email: row.email,
      asunto: row.asunto,
      url: row.url,
      instrucciones: row.instrucciones,
      origen: row.origen,
      verificado: row.verificado,
    });
    channels.set(String(row.oferta_id), values);
  }

  return offers.map((offer) => ({
    ...offer,
    facultades_normalizadas: faculties.get(String(offer.id)) || [],
    areas_normalizadas: areas.get(String(offer.id)) || [],
    skills_normalizadas: skills.get(String(offer.id)) || [],
    idiomas_normalizados: languages.get(String(offer.id)) || [],
    carreras_normalizadas: careers.get(String(offer.id)) || [],
    canales_postulacion: channels.get(String(offer.id)) || [],
  }));
}

export async function hydrateProfile(client, profile) {
  if (!profile?.id) return profile;
  const results = await Promise.all([
    client
      .from("perfil_areas_interes")
      .select("area:areas_interes(nombre)")
      .eq("perfil_id", profile.id),
    client
      .from("perfil_skills")
      .select("skill:skills(nombre)")
      .eq("perfil_id", profile.id),
    client
      .from("perfil_idiomas")
      .select("idioma:idiomas(nombre)")
      .eq("perfil_id", profile.id),
    client
      .from("skill_aliases")
      .select("alias_normalizado,skill:skills(nombre)"),
    client
      .from("idioma_aliases")
      .select("alias_normalizado,idioma:idiomas(nombre)"),
    profile.carrera_id
      ? client.from("carreras").select("nombre").eq("id", profile.carrera_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from("preferencias_matching")
      .select(
        "peso_skills,peso_areas,peso_carrera,peso_modalidad,peso_jornada,peso_horario,peso_salario,salario_minimo_deseado,moneda_preferida,periodicidad_preferida,fecha_actualizacion",
      )
      .eq("perfil_id", profile.id)
      .maybeSingle(),
  ]);
  if (results.some((result) => result.error))
    throw new Error("No se pudo cargar el perfil normalizado.");
  const names = (rows, relation) =>
    [...new Set((rows || []).map((row) => row[relation]?.nombre).filter(Boolean))];
  return {
    ...profile,
    carrera: results[5].data?.nombre || profile.carrera,
    areas_interes:
      names(results[0].data, "area").length > 0
        ? names(results[0].data, "area")
        : profile.areas_interes,
    skills: [
      ...new Set([
        ...names(results[1].data, "skill"),
        ...canonicalValues(profile.skills, results[3].data, "skill"),
      ]),
    ],
    idiomas: [
      ...new Set([
        ...names(results[2].data, "idioma"),
        ...canonicalValues(profile.idiomas, results[4].data, "idioma"),
      ]),
    ],
    matching_preferences: matchingPreferences(results[6].data),
  };
}
