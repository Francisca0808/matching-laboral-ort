const HEADING = /^(perfil|resumen|experiencia(?: laboral)?|formacion|educacion|estudios|skills?|habilidades|competencias|idiomas|contacto|referencias)\s*:?\s*$/i;
const lines = (text) => String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

function section(text, names) {
  const values = lines(text);
  const start = values.findIndex((line) => names.some((name) => name.test(line)));
  if (start < 0) return [];
  const result = [];
  for (const line of values.slice(start + 1)) {
    if (HEADING.test(line)) break;
    result.push(line);
    if (result.join(" ").length > 1800) break;
  }
  return result;
}

function detectName(text) {
  const values = lines(text).slice(0, 6);
  const labeled = values.find((line) => /^(nombre|name)\s*:/i.test(line));
  const candidate = (labeled?.split(":").slice(1).join(":") || values[0] || "").trim();
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{3,80}$/.test(candidate)) return { nombre: "", apellido: "" };
  const parts = candidate.split(/\s+/);
  if (parts.length < 2 || parts.length > 5) return { nombre: "", apellido: "" };
  return { nombre: parts[0], apellido: parts.slice(1).join(" ") };
}

export function extractProfileFacts(text) {
  const name = detectName(text);
  const education = section(text, [/^(formacion|educacion|estudios)\s*:?$/i]);
  const experience = section(text, [/^experiencia(?: laboral)?\s*:?$/i]);
  return {
    ...name,
    formacion: education.slice(0, 5).join(" · ").slice(0, 300),
    experiencia_resumen: experience.slice(0, 12).join(" · ").slice(0, 3000),
    experiencias: [],
  };
}

export function semanticSnippets(text) {
  return [...new Set(lines(text).flatMap((line) => line.split(/[.;]/)).map((line) => line.replace(/^[•*\-–—]+\s*/, "").trim()).filter((line) => line.length >= 12 && line.length <= 260))].slice(0, 40);
}
