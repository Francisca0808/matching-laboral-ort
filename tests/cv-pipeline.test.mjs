import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDetectedLanguages,
  normalizeDetectedSkills,
} from "../lib/cv/normalize.mjs";
import { validateCvAnalysis } from "../lib/cv/schema.mjs";
import { mergeCvSuggestions } from "../lib/cv/review.mjs";
import { calculateMatch } from "../lib/matching.mjs";
import { prepareExtractedText } from "../lib/cv/text.mjs";
import { extractCvText } from "../lib/cv/extract.mjs";
import { analyzeCvText } from "../lib/cv/analyze.mjs";
import { detectExactCatalogMatches, detectUnknownSkillSuggestions } from "../lib/cv/exact.mjs";
import { detectSemanticSkills, SEMANTIC_THRESHOLD } from "../lib/cv/semantic.mjs";

const skillAliases = [
  { alias_normalizado: "excel", skill: { id: 1, nombre: "Excel" } },
  { alias_normalizado: "sql", skill: { id: 2, nombre: "SQL" } },
  { alias_normalizado: "power bi", skill: { id: 3, nombre: "Power BI" } },
  { alias_normalizado: "powerbi", skill: { id: 3, nombre: "Power BI" } },
  {
    alias_normalizado: "google analytics 4",
    skill: { id: 4, nombre: "Google Analytics 4" },
  },
  { alias_normalizado: "ga4", skill: { id: 4, nombre: "Google Analytics 4" } },
];
const languageAliases = [
  { alias_normalizado: "ingles", idioma: { id: 1, nombre: "Inglés" } },
  { alias_normalizado: "english", idioma: { id: 1, nombre: "Inglés" } },
];

function simplePdf(text) {
  const stream = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test("normaliza Excel, SQL y Power BI contra el catálogo", () => {
  assert.deepEqual(
    normalizeDetectedSkills(["Excel", "SQL", "Power BI"], skillAliases).map(
      (item) => item.nombre,
    ),
    ["Excel", "SQL", "Power BI"],
  );
});

test("PowerBI y GA4 resuelven la skill canónica sin duplicarla", () => {
  const result = normalizeDetectedSkills(
    ["PowerBI", "Power BI", "GA4"],
    skillAliases,
  );
  assert.deepEqual(
    result.map((item) => [item.nombre, item.skill_id]),
    [
      ["Power BI", 3],
      ["Google Analytics 4", 4],
    ],
  );
});

test("mantiene una skill desconocida como sugerencia sin ID global", () => {
  assert.deepEqual(normalizeDetectedSkills(["Herramienta X"], skillAliases), [
    {
      detectada: "Herramienta X",
      normalizada: false,
      skill_id: null,
      nombre: "Herramienta X",
    },
  ]);
});

test("acepta un CV sin skills claras", () => {
  assert.deepEqual(normalizeDetectedSkills([], skillAliases), []);
});

test("rechaza un CV ilegible y limita el texto que se envía al modelo", () => {
  assert.throws(() => prepareExtractedText("   \u0000  "));
  assert.equal(prepareExtractedText("texto legible ".repeat(6000)).length, 60000);
});

test("extrae texto de un DOCX en el servidor", async () => {
  const fixture = Buffer.from(
    "UEsDBBQAAAAAAHRSQV3mdcR+iwEAAIsBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDw/eG1sIHZlcnNpb249IjEuMCI/PjxUeXBlcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9jb250ZW50LXR5cGVzIj48RGVmYXVsdCBFeHRlbnNpb249InJlbHMiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtcGFja2FnZS5yZWxhdGlvbnNoaXBzK3htbCIvPjxEZWZhdWx0IEV4dGVuc2lvbj0ieG1sIiBDb250ZW50VHlwZT0iYXBwbGljYXRpb24veG1sIi8+PE92ZXJyaWRlIFBhcnROYW1lPSIvd29yZC9kb2N1bWVudC54bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5kb2N1bWVudC5tYWluK3htbCIvPjwvVHlwZXM+UEsDBBQAAAAAAHRSQV1fM5VSBwEAAAcBAAALAAAAX3JlbHMvLnJlbHM8P3htbCB2ZXJzaW9uPSIxLjAiPz48UmVsYXRpb25zaGlwcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzIj48UmVsYXRpb25zaGlwIElkPSJySWQxIiBUeXBlPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvb2ZmaWNlRG9jdW1lbnQvMjAwNi9yZWxhdGlvbnNoaXBzL29mZmljZURvY3VtZW50IiBUYXJnZXQ9IndvcmQvZG9jdW1lbnQueG1sIi8+PC9SZWxhdGlvbnNoaXBzPlBLAwQUAAAAAAB0UkFdcfc2Kf4AAAD+AAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sPD94bWwgdmVyc2lvbj0iMS4wIj8+PHc6ZG9jdW1lbnQgeG1sbnM6dz0iaHR0cDovL3NjaGVtYXMub3JnL3dvcmRwcm9jZXNzaW5nbWwvMjAwNi9tYWluIj48dzpib2R5Pjx3OnA+PHc6cj48dzp0PkFuYWxpc3RhIGNvbiBleHBlcmllbmNpYSBlbiBFeGNlbCwgU1FMIHkgUG93ZXIgQkkuIEluZ2zDqXMgQzEgeSBmb3JtYWNpw7NuIGVuIFNpc3RlbWFzLjwvdzp0PjwvdzpyPjwvdzpwPjwvdzpib2R5Pjwvdzpkb2N1bWVudD5QSwECFAMUAAAAAAB0UkFd5nXEfosBAACLAQAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAAAHRSQV1fM5VSBwEAAAcBAAALAAAAAAAAAAAAAACAAbwBAABfcmVscy8ucmVsc1BLAQIUAxQAAAAAAHRSQV1x9zYp/gAAAP4AAAARAAAAAAAAAAAAAACAAewCAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAwADALkAAAAZBAAAAAA=",
    "base64",
  );
  assert.ok(fixture.length > 0);
  const validFixture = Buffer.from(
    "UEsDBBQAAAAIAIxSQV3mdcR+0gAAAIsBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QvVLDMAzHX8XnlasVGBh6SToAKzD0BXSOkvjw11luad++Sls6cIVR+n/8ZLebQ/BqT4Vdip1+NI3e9O32mImVKJE7Pdea1wBsZwrIJmWKooypBKwylgky2i+cCJ6a5hlsipViXdWlQ/ftK42481W9HWR9oRTyrNXLxbiwOo05e2exig77OPyirK4EI8mzh2eX+UEMGu4SFuVvwDX3Ic8ubiD1iaW+YxAXfKcywJDsLkjS/F9z5840js7SLb+05ZIsMbs4BW9uSkAXf+6H83f3J1BLAwQUAAAACACMUkFdXzOVUpUAAAAHAQAACwAAAF9yZWxzLy5yZWxzjc87DsIwDAbgq0Q+QJ0yMKCmXVi6Ii4QJW5T0TzkhNftycBAEQOjf//6LHfDw6/iRpyXGBS0jYSh70606lKD7JaURW2ErMCVkg6I2TjyOjcxUaibKbLXpY48Y9LmomfCnZR75E8DtqYYrQIebQvi/Ez0jx2naTF0jObqKZQfJ74aVdY8U1Fwj2zRvuOmsoB9h5sX+xdQSwMEFAAAAAgAjFJBXXH3NinDAAAA/gAAABEAAAB3b3JkL2RvY3VtZW50LnhtbEWPMW7DMAxFr0J4LiwnQwfDcdAEHQx0SJETKDLrCJBIgVJj50ide4RcrJIzdHkE+cHPz26/eAc3lGiZdtWmbqp9383tyObbIyXIMsV23lXXlEKrVDRX9DrWHJCy9sXidcqtTGpmGYOwwRgtTd6pbdO8Kq8tVcXywuO91FAgBal/I+1sTBoME+ASUCySsRqQ4H0x6F7g/PkBdzjxjAKHoYaBJvf4iXDc5PF63tjHL5WNc7Zaw3WqmBfKyrDyGUD9P9f/AVBLAQIUAxQAAAAIAIxSQV3mdcR+0gAAAIsBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAjFJBXV8zlVKVAAAABwEAAAsAAAAAAAAAAAAAAIABAwEAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAjFJBXXH3NinDAAAA/gAAABEAAAAAAAAAAAAAAIABwQEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAALMCAAAAAA==",
    "base64",
  );
  const text = await extractCvText(
    validFixture,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.match(text, /Excel, SQL y Power BI/);
  assert.match(text, /Inglés C1/);
});

test("extrae texto de un PDF en el servidor", async () => {
  const text = await extractCvText(
    simplePdf("CV con experiencia comprobable en Excel SQL y Power BI"),
    "application/pdf",
  );
  assert.match(text, /Excel SQL y Power BI/);
});

test("detecta PowerBI, GA4 e English C1 directamente desde el texto", async () => {
  const catalog = { skillAliases, languageAliases };
  const result = await analyzeCvText(
    "Ana Pérez\nSkills\nPowerBI, GA4\nIdiomas\nEnglish C1",
    { catalog, semantic: false },
  );
  assert.deepEqual(result.data.skills.map((item) => item.nombre), [
    "Power BI",
    "Google Analytics 4",
  ]);
  assert.deepEqual(result.data.idiomas.map((item) => [item.nombre, item.nivel]), [
    ["Inglés", "C1"],
  ]);
  assert.equal(result.model, "local:reglas-exactas");
});

test("Microsoft Excel avanzado resuelve Excel por coincidencia exacta", () => {
  const result = detectExactCatalogMatches("Microsoft Excel avanzado", {
    skillAliases,
    languageAliases,
  });
  assert.equal(result.skills[0].nombre, "Excel");
});

test("la similitud semántica propone Excel solo con confianza y margen suficientes", async () => {
  const aliases = skillAliases.filter((row) => [1, 2].includes(row.skill.id));
  const result = await detectSemanticSkills(
    ["manejo avanzado de hojas de cálculo"],
    aliases,
    {
      embed: async () => [
        [1, 0],
        [0.82, Math.sqrt(1 - 0.82 ** 2)],
        [0.41, Math.sqrt(1 - 0.41 ** 2)],
      ],
    },
  );
  assert.equal(result[0].nombre, "Excel");
  assert.ok(result[0].confianza >= SEMANTIC_THRESHOLD);
  assert.equal(result[0].origen, "semantica");
});

test("rechaza una sugerencia semántica débil", async () => {
  const result = await detectSemanticSkills(
    ["atención telefónica"],
    skillAliases.slice(0, 2),
    { embed: async () => [[1, 0], [0.55, 0.84], [0.5, 0.86]] },
  );
  assert.deepEqual(result, []);
});

test("si falla el modelo semántico conserva el análisis exacto", async () => {
  const result = await analyzeCvText("Skills\nPowerBI\nExperiencia creando reportes", {
    catalog: { skillAliases, languageAliases },
    embed: async () => { throw new Error("modelo no disponible"); },
  });
  assert.equal(result.data.skills[0].nombre, "Power BI");
  assert.equal(result.data.analisis.semantica_disponible, false);
  assert.equal(result.model, "local:reglas-exactas");
});

test("conserva una skill desconocida de la sección Skills sin crear catálogo", () => {
  assert.deepEqual(
    detectUnknownSkillSuggestions("Skills\nHerramienta X", ["Excel"])[0],
    {
      detectada: "Herramienta X",
      normalizada: false,
      skill_id: null,
      nombre: "Herramienta X",
      origen: "texto_libre",
      confianza: null,
    },
  );
});

test("normaliza English e Inglés y conserva solo niveles explícitos", () => {
  const result = normalizeDetectedLanguages(
    [
      { nombre: "English", nivel: "C1" },
      { nombre: "Inglés", nivel: "" },
    ],
    languageAliases,
  );
  assert.deepEqual(result, [
    {
      detectado: "English",
      nivel: "C1",
      normalizado: true,
      idioma_id: 1,
      nombre: "Inglés",
    },
  ]);
});

test("rechaza una respuesta de IA incompleta o con listas inválidas", () => {
  assert.throws(() => validateCvAnalysis({ skills: [] }));
  assert.throws(() =>
    validateCvAnalysis({
      nombre: "",
      apellido: "",
      formacion: "",
      skills: [],
      herramientas_tecnologias: [],
      idiomas: "Inglés",
      experiencia_resumen: "",
      experiencias: [],
    }),
  );
});

test("un perfil vacío puede incorporar sugerencias seleccionadas", () => {
  const result = mergeCvSuggestions(
    { skills: [], idiomas: [] },
    {
      nombre: "Ana",
      apellido: "Pérez",
      formacion: "Sistemas",
      experiencia_resumen: "Analista junior",
      skills: [{ nombre: "SQL" }],
      idiomas: [{ nombre: "Inglés" }],
    },
    {
      nombre: true,
      apellido: true,
      formacion: true,
      experiencia_resumen: true,
      skills: ["SQL"],
      idiomas: ["Inglés"],
    },
  );
  assert.equal(result.nombre, "Ana");
  assert.equal(result.carrera, "Sistemas");
  assert.deepEqual(result.skills, ["SQL"]);
});

test("no sobrescribe datos existentes ni incorpora sugerencias rechazadas", () => {
  const result = mergeCvSuggestions(
    { nombre: "Nombre actual", skills: ["Excel"], idiomas: [] },
    {
      nombre: "Nombre detectado",
      skills: [{ nombre: "SQL" }, { nombre: "Power BI" }],
      idiomas: [],
    },
    { nombre: false, skills: ["SQL"], idiomas: [] },
  );
  assert.equal(result.nombre, "Nombre actual");
  assert.deepEqual(result.skills, ["Excel", "SQL"]);
});

test("el matching prioriza oferta_skills y usa texto solo como fallback", () => {
  const profile = {
    skills: ["Power BI"],
    idiomas: [],
    areas_interes: [],
  };
  const structured = calculateMatch(profile, {
    requisitos: "Excel SQL",
    skills_normalizadas: ["Power BI"],
  });
  const fallback = calculateMatch(profile, { requisitos: "PowerBI" });
  assert.equal(structured.breakdown.skills, 30);
  assert.equal(structured.requiredSkills.length, 1);
  assert.equal(fallback.breakdown.skills, 30);
});
