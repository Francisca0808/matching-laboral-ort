export const SEMANTIC_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
export const SEMANTIC_THRESHOLD = 0.58;
export const SEMANTIC_HIGH_CONFIDENCE = 0.7;
export const SEMANTIC_MARGIN = 0.08;

let extractorPromise;

async function defaultEmbed(values) {
  extractorPromise ||= import("@huggingface/transformers").then(({ pipeline, env }) => {
    env.cacheDir = process.env.TRANSFORMERS_CACHE || "/tmp/transformers-cache";
    return pipeline("feature-extraction", SEMANTIC_MODEL, { dtype: "q8" });
  });
  const extractor = await extractorPromise;
  const output = await extractor(values, { pooling: "mean", normalize: true });
  return output.tolist();
}

const DESCRIPTIONS = {
  excel: "Excel hojas de cálculo planillas fórmulas tablas dinámicas Microsoft Excel spreadsheet",
  "power bi": "Power BI creación de dashboards visualización de datos reportes business intelligence",
  sql: "SQL consultas bases de datos relacionales query database",
  "google analytics 4": "Google Analytics 4 GA4 analítica web métricas tráfico digital",
  python: "Python programación scripts automatización análisis de datos",
  javascript: "JavaScript desarrollo web programación frontend",
};

function candidates(aliasRows) {
  const grouped = new Map();
  for (const row of aliasRows || []) {
    if (!row.skill?.id || !row.skill?.nombre) continue;
    const current = grouped.get(row.skill.id) || { id: row.skill.id, nombre: row.skill.nombre, aliases: [] };
    current.aliases.push(row.alias_normalizado);
    grouped.set(row.skill.id, current);
  }
  return [...grouped.values()].map((item) => ({ ...item, description: DESCRIPTIONS[item.nombre.toLowerCase()] || `${item.nombre} ${item.aliases.join(" ")}` }));
}

const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);

export async function detectSemanticSkills(snippets, aliasRows, options = {}) {
  const list = candidates(aliasRows).filter((item) => !(options.excludeSkillIds || []).includes(item.id));
  if (!snippets.length || !list.length) return [];
  const vectors = await (options.embed || defaultEmbed)([...snippets, ...list.map((item) => item.description)]);
  const snippetVectors = vectors.slice(0, snippets.length);
  const candidateVectors = vectors.slice(snippets.length);
  const matches = [];
  for (let snippetIndex = 0; snippetIndex < snippets.length; snippetIndex += 1) {
    const ranked = list.map((item, index) => ({ item, score: dot(snippetVectors[snippetIndex], candidateVectors[index]) })).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1]?.score ?? 0;
    if (best.score < SEMANTIC_THRESHOLD || best.score - second < SEMANTIC_MARGIN) continue;
    matches.push({ detectada: snippets[snippetIndex], normalizada: true, skill_id: best.item.id, nombre: best.item.nombre, origen: "semantica", confianza: Number(best.score.toFixed(3)) });
  }
  return [...new Map(matches.sort((a, b) => b.confianza - a.confianza).map((item) => [item.skill_id, item])).values()].slice(0, 8);
}

export function resetSemanticModelForTests() { extractorPromise = undefined; }
