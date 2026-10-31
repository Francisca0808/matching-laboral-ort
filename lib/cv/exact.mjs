import { normalizeCatalogText } from "./normalize.mjs";

const LEVELS = [
  [/(?:^|\s)(a1|a2|b1|b2|c1|c2)(?:\s|$)/i, (match) => match[1].toUpperCase()],
  [/\b(nativo|bilingue|avanzado|intermedio|basico)\b/i, (match) => match[1]],
];

const containsPhrase = (text, phrase) => ` ${text} `.includes(` ${phrase} `);

function uniqueCanonical(rows, relation) {
  const values = new Map();
  for (const row of rows || []) {
    const entity = row[relation];
    const alias = normalizeCatalogText(row.alias_normalizado);
    if (!entity?.id || !entity?.nombre || !alias) continue;
    values.set(`${entity.id}:${alias}`, { alias, entity });
  }
  return [...values.values()].sort((a, b) => b.alias.length - a.alias.length);
}

function explicitLanguageLevel(source, alias) {
  const normalized = normalizeCatalogText(source);
  const position = normalized.indexOf(alias);
  if (position < 0) return "";
  const nearby = normalized.slice(position, position + alias.length + 35);
  for (const [pattern, read] of LEVELS) {
    const match = nearby.match(pattern);
    if (match) return read(match);
  }
  return "";
}

export function detectExactCatalogMatches(text, catalog) {
  const normalized = normalizeCatalogText(text);
  const skillIds = new Set();
  const skills = [];
  for (const { alias, entity } of uniqueCanonical(catalog.skillAliases, "skill")) {
    if (skillIds.has(entity.id) || !containsPhrase(normalized, alias)) continue;
    skillIds.add(entity.id);
    skills.push({ detectada: alias, normalizada: true, skill_id: entity.id, nombre: entity.nombre, origen: "exacta", confianza: 1 });
  }
  const languageIds = new Set();
  const idiomas = [];
  for (const { alias, entity } of uniqueCanonical(catalog.languageAliases, "idioma")) {
    if (languageIds.has(entity.id) || !containsPhrase(normalized, alias)) continue;
    languageIds.add(entity.id);
    idiomas.push({ detectado: alias, normalizado: true, idioma_id: entity.id, nombre: entity.nombre, nivel: explicitLanguageLevel(text, alias), origen: "exacta", confianza: 1 });
  }
  return { skills, idiomas };
}

const SKILL_SECTION = /^(?:skills?|habilidades|competencias|herramientas|tecnologias)(?:\s+y\s+tecnologias)?\s*:?\s*$/i;
const SECTION = /^(?:experiencia|formacion|educacion|idiomas|perfil|resumen|contacto|referencias)(?:\s+\w+){0,2}\s*:?\s*$/i;

export function detectUnknownSkillSuggestions(text, knownNames = []) {
  const known = new Set(knownNames.map(normalizeCatalogText));
  const lines = String(text).split(/\r?\n/).map((line) => line.trim());
  const values = [];
  let inside = false;
  for (const line of lines) {
    if (SKILL_SECTION.test(line)) { inside = true; continue; }
    if (inside && SECTION.test(line)) break;
    if (!inside || !line || line.length > 160) continue;
    for (const value of line.replace(/^[•*\-–—]+\s*/, "").split(/[,;|•]/)) {
      const clean = value.trim();
      const normalized = normalizeCatalogText(clean);
      if (clean.length >= 2 && clean.length <= 60 && !known.has(normalized)) values.push(clean);
    }
  }
  return [...new Map(values.map((value) => [normalizeCatalogText(value), value])).values()].slice(0, 12).map((nombre) => ({
    detectada: nombre, normalizada: false, skill_id: null, nombre, origen: "texto_libre", confianza: null,
  }));
}
