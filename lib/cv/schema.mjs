const clean = (value, max = 3000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanList = (value, maxItems = 60, maxLength = 120) =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => clean(item, maxLength)).filter(Boolean))].slice(
        0,
        maxItems,
      )
    : [];

export const cvAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "nombre",
    "apellido",
    "formacion",
    "skills",
    "herramientas_tecnologias",
    "idiomas",
    "experiencia_resumen",
    "experiencias",
  ],
  properties: {
    nombre: { type: "string" },
    apellido: { type: "string" },
    formacion: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    herramientas_tecnologias: { type: "array", items: { type: "string" } },
    idiomas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "nivel"],
        properties: {
          nombre: { type: "string" },
          nivel: { type: "string" },
        },
      },
    },
    experiencia_resumen: { type: "string" },
    experiencias: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["empresa", "cargo", "descripcion", "fecha_inicio", "fecha_fin"],
        properties: {
          empresa: { type: "string" },
          cargo: { type: "string" },
          descripcion: { type: "string" },
          fecha_inicio: { type: "string" },
          fecha_fin: { type: "string" },
        },
      },
    },
  },
};

export function validateCvAnalysis(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("La respuesta del análisis no tiene el formato esperado.");
  const required = Object.keys(cvAnalysisSchema.properties);
  if (required.some((key) => !(key in value)))
    throw new Error("La respuesta del análisis está incompleta.");
  if (!Array.isArray(value.idiomas) || !Array.isArray(value.experiencias))
    throw new Error("La respuesta del análisis contiene listas inválidas.");
  const idiomas = value.idiomas.slice(0, 20).map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("La respuesta del análisis contiene un idioma inválido.");
    return { nombre: clean(item.nombre, 80), nivel: clean(item.nivel, 80) };
  }).filter((item) => item.nombre);
  const experiencias = value.experiencias.slice(0, 20).map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("La respuesta contiene una experiencia inválida.");
    return {
      empresa: clean(item.empresa, 160),
      cargo: clean(item.cargo, 160),
      descripcion: clean(item.descripcion, 800),
      fecha_inicio: clean(item.fecha_inicio, 40),
      fecha_fin: clean(item.fecha_fin, 40),
    };
  });
  return {
    nombre: clean(value.nombre, 80),
    apellido: clean(value.apellido, 80),
    formacion: clean(value.formacion, 300),
    skills: cleanList(value.skills),
    herramientas_tecnologias: cleanList(value.herramientas_tecnologias),
    idiomas,
    experiencia_resumen: clean(value.experiencia_resumen, 3000),
    experiencias,
  };
}
