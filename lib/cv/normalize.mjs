export function normalizeCatalogText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildAliasMap(rows, relation) {
  return new Map(
    (rows || [])
      .filter((row) => row[relation]?.id && row[relation]?.nombre)
      .map((row) => [normalizeCatalogText(row.alias_normalizado), row[relation]]),
  );
}

export function normalizeDetectedSkills(values, aliases) {
  const map = buildAliasMap(aliases, "skill");
  const seen = new Set();
  return [...new Set((values || []).filter(Boolean))].map((detected) => {
    const skill = map.get(normalizeCatalogText(detected));
    const key = skill ? `id:${skill.id}` : `raw:${normalizeCatalogText(detected)}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return {
      detectada: String(detected).trim(),
      normalizada: Boolean(skill),
      skill_id: skill?.id || null,
      nombre: skill?.nombre || String(detected).trim(),
    };
  }).filter(Boolean);
}

export function normalizeDetectedLanguages(values, aliases) {
  const map = buildAliasMap(aliases, "idioma");
  const seen = new Set();
  return (values || []).map((item) => {
    const detected = String(item?.nombre || "").trim();
    if (!detected) return null;
    const language = map.get(normalizeCatalogText(detected));
    const key = language ? `id:${language.id}` : `raw:${normalizeCatalogText(detected)}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return {
      detectado: detected,
      nivel: String(item?.nivel || "").trim(),
      normalizado: Boolean(language),
      idioma_id: language?.id || null,
      nombre: language?.nombre || detected,
    };
  }).filter(Boolean);
}

export async function normalizeCvResult(client, result) {
  const [skillAliases, languageAliases] = await Promise.all([
    client.from("skill_aliases").select("alias_normalizado,skill:skills(id,nombre)"),
    client.from("idioma_aliases").select("alias_normalizado,idioma:idiomas(id,nombre)"),
  ]);
  if (skillAliases.error || languageAliases.error)
    throw new Error("No se pudieron consultar los catálogos normalizados.");
  return {
    ...result,
    skills: normalizeDetectedSkills(
      [...result.skills, ...result.herramientas_tecnologias],
      skillAliases.data,
    ),
    idiomas: normalizeDetectedLanguages(result.idiomas, languageAliases.data),
  };
}

export async function loadCvCatalog(client) {
  const [skillAliases, languageAliases] = await Promise.all([
    client.from("skill_aliases").select("alias_normalizado,skill:skills(id,nombre)"),
    client.from("idioma_aliases").select("alias_normalizado,idioma:idiomas(id,nombre)"),
  ]);
  if (skillAliases.error || languageAliases.error)
    throw new Error("No se pudieron consultar los catálogos normalizados.");
  return {
    skillAliases: skillAliases.data || [],
    languageAliases: languageAliases.data || [],
  };
}
