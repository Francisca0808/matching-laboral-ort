export const MATCHING_WEIGHT_KEYS = [
  "skills",
  "area",
  "formacion",
  "modalidad",
  "jornada",
  "horario",
  "salario",
];

export const DEFAULT_MATCHING_WEIGHTS = Object.freeze({
  skills: 30,
  area: 25,
  formacion: 15,
  modalidad: 10,
  jornada: 10,
  horario: 10,
  salario: 0,
});

export function normalizeWeights(input = DEFAULT_MATCHING_WEIGHTS) {
  const safe = Object.fromEntries(
    MATCHING_WEIGHT_KEYS.map((key) => {
      const value = Number(input?.[key]);
      return [key, Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0];
    }),
  );
  const total = Object.values(safe).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { ...DEFAULT_MATCHING_WEIGHTS };
  const normalized = Object.fromEntries(
    MATCHING_WEIGHT_KEYS.map((key) => [
      key,
      Math.round((safe[key] / total) * 10000) / 100,
    ]),
  );
  const roundedTotal = Object.values(normalized).reduce(
    (sum, value) => sum + value,
    0,
  );
  const largest = MATCHING_WEIGHT_KEYS.reduce((best, key) =>
    safe[key] > safe[best] ? key : best,
  );
  normalized[largest] =
    Math.round((normalized[largest] + 100 - roundedTotal) * 100) / 100;
  return normalized;
}

export function validateWeightInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Configuración de pesos inválida.");
  const values = {};
  for (const key of MATCHING_WEIGHT_KEYS) {
    const value = Number(input[key] ?? 0);
    if (!Number.isFinite(value) || value < 0 || value > 100)
      throw new Error("Cada importancia debe estar entre 0 y 100.");
    values[key] = value;
  }
  return normalizeWeights(values);
}

export function matchingPreferences(row) {
  if (!row)
    return {
      mode: "recommended",
      weights: { ...DEFAULT_MATCHING_WEIGHTS },
      updatedAt: null,
    };
  return {
    mode: "custom",
    weights: normalizeWeights({
      skills: row.peso_skills,
      area: row.peso_areas,
      formacion: row.peso_carrera,
      modalidad: row.peso_modalidad,
      jornada: row.peso_jornada,
      horario: row.peso_horario,
      salario: row.peso_salario,
    }),
    salaryMinimum:
      row.salario_minimo_deseado === null
        ? null
        : Number(row.salario_minimo_deseado),
    salaryCurrency: row.moneda_preferida || null,
    salaryPeriodicity: row.periodicidad_preferida || null,
    updatedAt: row.fecha_actualizacion || null,
  };
}

export function preferencesToRow(weights) {
  const normalized = normalizeWeights(weights);
  return {
    peso_skills: normalized.skills,
    peso_areas: normalized.area,
    peso_carrera: normalized.formacion,
    peso_modalidad: normalized.modalidad,
    peso_jornada: normalized.jornada,
    peso_horario: normalized.horario,
    peso_salario: normalized.salario,
  };
}
