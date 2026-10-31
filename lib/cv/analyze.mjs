import { validateCvAnalysis } from "./schema.mjs";
import { detectExactCatalogMatches, detectUnknownSkillSuggestions } from "./exact.mjs";
import { extractProfileFacts, semanticSnippets } from "./rules.mjs";
import { detectSemanticSkills, SEMANTIC_MODEL } from "./semantic.mjs";

export async function analyzeCvText(text, options = {}) {
  const catalog = options.catalog || { skillAliases: [], languageAliases: [] };
  const exact = detectExactCatalogMatches(text, catalog);
  let semantic = [];
  let semanticAvailable = options.semantic !== false;
  try {
    if (semanticAvailable)
      semantic = await detectSemanticSkills(semanticSnippets(text), catalog.skillAliases, {
        embed: options.embed,
        excludeSkillIds: exact.skills.map((item) => item.skill_id),
      });
  } catch {
    semanticAvailable = false;
  }
  const facts = extractProfileFacts(text);
  const base = validateCvAnalysis({
    ...facts,
    skills: [],
    herramientas_tecnologias: [],
    idiomas: [],
  });
  const unknown = detectUnknownSkillSuggestions(
    text,
    [...exact.skills, ...semantic].flatMap((item) => [item.nombre, item.detectada]),
  );
  return {
    data: {
      ...base,
      skills: [...exact.skills, ...semantic, ...unknown],
      idiomas: exact.idiomas,
      analisis: {
        semantica_disponible: semanticAvailable,
        metodo: semanticAvailable ? "exacta_y_semantica_local" : "solo_exacta",
      },
    },
    model: semanticAvailable
      ? `local:${SEMANTIC_MODEL}:q8`
      : "local:reglas-exactas",
  };
}
