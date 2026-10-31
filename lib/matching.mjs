import {
  DEFAULT_MATCHING_WEIGHTS,
  MATCHING_WEIGHT_KEYS,
  normalizeWeights,
} from "./matching-weights.mjs";

// Reglas transparentes para el catálogo académico. La IA no calcula el score.
export function normalize(value = "") {
  return String(value ?? "")
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.net\b/g, " dotnet ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function has(text, phrase) {
  return ` ${normalize(text)} `.includes(` ${normalize(phrase)} `);
}
const dictionary = {
  Ruby: ["ruby"],
  Rails: ["rails", "ruby on rails"],
  Docker: ["docker"],
  Linux: ["linux"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  Genexus: ["genexus"],
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql"],
  Kubernetes: ["kubernetes"],
  PHP: ["php"],
  Angular: ["angular"],
  Selenium: ["selenium"],
  Jira: ["jira"],
  Excel: ["excel", "planillas de calculo"],
  SQL: ["sql"],
  "Power BI": ["power bi", "powerbi"],
  Python: ["python"],
  JavaScript: ["javascript", "js"],
  TypeScript: ["typescript"],
  Java: ["java"],
  "C#": ["c#", "c sharp"],
  ".NET": [".net", "asp.net", "asp. net", "net framework"],
  React: ["react"],
  HTML: ["html"],
  CSS: ["css"],
  Git: ["git", "github"],
  SAP: ["sap"],
  ERP: ["erp"],
  Tableau: ["tableau"],
  QlikView: ["qlikview"],
  Word: ["word"],
  PowerPoint: ["powerpoint"],
  Office: ["office", "ofimatica"],
  Inglés: ["ingles", "english"],
  Portugués: ["portugues"],
  Francés: ["frances"],
  Comunicación: ["comunicacion"],
  Liderazgo: ["liderazgo", "liderando", "liderar equipos"],
  "Trabajo en equipo": ["trabajo en equipo", "trabajar en equipo"],
  Organización: ["organizacion", "organizado", "organizada"],
  Ventas: ["ventas"],
  Marketing: ["marketing"],
  Contabilidad: ["contabilidad", "contables"],
  "Análisis de datos": ["analisis de datos", "data analytics"],
  Photoshop: ["photoshop"],
  Illustrator: ["illustrator"],
  Figma: ["figma"],
  AutoCAD: ["autocad"],
  "Atención al cliente": ["atencion al cliente"],
  "Entity Framework": ["entity framework"],
  Informix: ["informix"],
};
export function requiredSkills(text) {
  return Object.entries(dictionary)
    .filter(([, aliases]) => aliases.some((x) => has(text, x)))
    .map(([name]) => name);
}
const groups = [
  {
    terms: [
      "informatica",
      "sistemas",
      "programacion",
      "software",
      "computacion",
      "analista programador",
    ],
    faculty: "ingenieria",
  },
  {
    terms: [
      "administracion",
      "economia",
      "contabilidad",
      "contador",
      "negocios",
      "finanzas",
      "marketing",
    ],
    faculty: "administracion y ciencias sociales",
  },
  {
    terms: ["comunicacion", "publicidad", "periodismo", "audiovisual"],
    faculty: "comunicacion",
  },
  { terms: ["diseno", "arquitectura"], faculty: "arquitectura" },
];
const stop = new Set([
  "de",
  "en",
  "y",
  "la",
  "el",
  "del",
  "los",
  "las",
  "al",
  "con",
  "para",
  "un",
  "una",
]);
const words = (text) =>
  normalize(text)
    .split(" ")
    .filter((w) => w.length > 2 && !stop.has(w));
function ranges(text) {
  const out = [];
  const re = /(\d{1,2})(?::(\d{2}))?\s*(?:a|hasta|-)\s*(\d{1,2})(?::(\d{2}))?/g;
  for (const m of String(text || "")
    .toLowerCase()
    .matchAll(re)) {
    const a = Number(m[1]) + Number(m[2] || 0) / 60,
      b = Number(m[3]) + Number(m[4] || 0) / 60;
    if (
      a >= 0 &&
      b <= 24 &&
      a < b &&
      Number(m[2] || 0) < 60 &&
      Number(m[4] || 0) < 60
    )
      out.push([a, b]);
  }
  return out;
}
const criterion = (score, available, matches = [], review = [], extra = {}) => ({
  score: available ? Math.min(100, Math.max(0, score)) : null,
  available,
  matches,
  review,
  ...extra,
});

export function calculateAreaScore(profile, offer) {
  const p = profile || {}, o = offer || {}, matches = [], review = [];
  const text = normalize(`${o.puesto || ""} ${o.descripcion || ""}`);
  const normalizedAreas = (o.areas_normalizadas || []).filter((x) => normalize(x));
  const areaText = normalize(`${normalizedAreas.join(" ")} ${text}`);
  const interests = (p.areas_interes || []).filter((x) => normalize(x));
  const available = Boolean(areaText);
  const exact = interests.find((x) => has(areaText, x));
  const partial = interests.find((x) =>
    words(x).some((w) => has(areaText, w)),
  );
  if (exact) {
    matches.push(`Coincide con tu interés en ${exact}.`);
  } else if (partial) {
    matches.push(`Coincidencia parcial con tu interés en ${partial}.`);
  } else review.push("No se identificó una coincidencia de área de interés.");
  return criterion(exact ? 100 : partial ? 50 : 0, available, matches, review);
}

export function calculateSkillScore(profile, offer) {
  const p = profile || {}, o = offer || {}, matches = [], review = [];
  const structuredRequired = [
    ...(o.skills_normalizadas || []),
    ...(o.idiomas_normalizados || []),
  ];
  const required = [
    ...new Set(
      structuredRequired.length
        ? structuredRequired
        : requiredSkills(o.requisitos),
    ),
  ];
  const declaredValues = [...(p.skills || []), ...(p.idiomas || [])];
  const declared = declaredValues.join(", ");
  const covered = required.filter((name) => {
    if (declaredValues.some((value) => normalize(value) === normalize(name)))
      return true;
    return (dictionary[name] || [name]).some((alias) => has(declared, alias));
  });
  const missing = required.filter((x) => !covered.includes(x));
  if (required.length) {
    if (covered.length)
      matches.push(
        `Declaraste ${covered.join(", ")}: ${covered.length} de ${required.length} habilidades identificadas.`,
      );
    if (missing.length)
      review.push(
        `La oferta menciona ${missing.join(", ")} y no aparecen en tu perfil. Revisá cuáles son excluyentes y cuáles valoradas.`,
      );
  } else
    review.push(
      "La oferta no tiene habilidades identificables; este criterio se excluye del cálculo.",
    );
  return criterion(
    required.length ? (100 * covered.length) / required.length : 0,
    required.length > 0,
    matches,
    review,
    { requiredSkills: required, matchedSkills: covered },
  );
}

export function calculateCareerScore(profile, offer) {
  const p = profile || {}, o = offer || {}, matches = [], review = [];
  const training = normalize(
      `${(o.facultades_normalizadas || []).join(" ")} ${(o.carreras_normalizadas || []).join(" ")} ${o.facultades || ""} ${o.requisitos || ""}`,
    ),
    career = normalize(p.carrera);
  const requirements = normalize(o.requisitos);
  const available = Boolean(
    (o.facultades_normalizadas || []).length ||
      (o.carreras_normalizadas || []).length ||
      normalize(o.facultades) ||
      /\b(estudiante|carrera|licenciatura|ingenieria|tecnicatura|contador|egresad|graduad|recibid|formacion)\b/.test(requirements),
  );
  let score = 0;
  const related =
    career && groups.find((g) => g.terms.some((t) => has(career, t)));
  if (
    career &&
    (has(training, career) ||
      words(career)
        .filter(
          (t) =>
            ![
              "licenciatura",
              "licenciado",
              "ingenieria",
              "tecnico",
              "tecnicatura",
              "analista",
            ].includes(t),
        )
        .some((t) => has(o.requisitos, t)))
  ) {
    score = 100 * (10 / 15);
    matches.push("La formación mencionada coincide con tu carrera.");
  } else if (
    related &&
    (has(training, related.faculty) ||
      related.terms.some((t) => has(o.requisitos, t)))
  ) {
    score = 100 * (5 / 15);
    matches.push(
      "Tu carrera pertenece a un área de formación relacionada (coincidencia parcial).",
    );
  } else if (available)
    review.push(
      "Revisá la formación solicitada; no se identificó una coincidencia con tu carrera.",
    );
  const minimum = String(o.requisitos || "").match(
    /(?:a partir de|desde|minimo|mínimo)\s*(\d)\s*(?:[.º°o]|er|do|ro|to)?\s*a[ñn]o/i,
  );
  const advanced =
    has(requirements, "avanzados") ||
    has(requirements, "avanzado") ||
    has(requirements, "ultimos anos");
  const student = /\bestudiantes?\b/.test(requirements);
  const graduated = /\b(egresados?|graduados?|recibidos?)\b/.test(requirements);
  if (score > 0 && minimum) {
    if (p.anio_carrera >= Number(minimum[1])) {
      score += 100 * (5 / 15);
      matches.push(
        `Tu año alcanza el mínimo explícito de ${minimum[1]} indicado.`,
      );
    } else review.push(`La oferta solicita al menos año ${minimum[1]}.`);
  } else if (score > 0 && student && !advanced) {
    score += 100 * (5 / 15);
    matches.push("La oferta admite estudiantes sin indicar un año mínimo.");
  } else if (advanced)
    review.push(
      "Se solicita formación avanzada: el año de carrera por sí solo no confirma avance curricular.",
    );
  else if (graduated)
    review.push(
      "La oferta menciona egreso; el perfil no acredita un título obtenido.",
    );
  else if (available && score > 0)
    review.push(
      "No hay información suficiente para confirmar la etapa de formación.",
    );
  if (!available)
    review.push("La oferta no informa formación; este criterio se excluye del cálculo.");
  return criterion(score, available, matches, review);
}

export function calculateWorkloadScore(profile, offer) {
  const p = profile || {}, o = offer || {}, matches = [], review = [];
  const jornada = normalize(o.jornada),
    hours = Number(p.horas_semanales) || 0;
  let score = 0;
  const available = ["part time", "full time"].includes(jornada);
  if (jornada === "part time") {
    score = hours >= 20 ? 100 : hours > 0 ? 50 : 0;
    if (score === 100)
      matches.push(
        "Tu disponibilidad alcanza la referencia de 20 horas para jornada parcial.",
      );
    else
      review.push(
        "La jornada parcial usa una referencia de 20 horas; confirmá las horas reales.",
      );
  } else if (jornada === "full time") {
    score = hours >= 40 ? 100 : hours >= 30 ? 50 : 0;
    if (score === 100)
      matches.push(
        "Tu disponibilidad alcanza la referencia de 40 horas para jornada completa.",
      );
    else
      review.push(
        "La jornada completa usa una referencia de 40 horas y supera tu disponibilidad declarada.",
      );
  } else
    review.push(
      "La jornada no permite confirmar compatibilidad; este criterio se excluye del cálculo.",
    );
  return criterion(score, available, matches, review);
}

export function calculateScheduleScore(profile, offer) {
  const p = profile || {}, o = offer || {}, matches = [], review = [];
  const availability = normalize(p.disponibilidad_horaria),
    schedule = normalize(o.horario);
  const requested = ranges(o.horario),
    available = ranges(p.disponibilidad_horaria);
  const unknown =
    !schedule ||
    ["no informado", "a convenir", "no especificado"].includes(schedule);
  let score = 0;
  if (!unknown && availability === "flexible") {
    score = 100;
    matches.push(
      "Declaraste horario flexible; revisá los días concretos de la oferta.",
    );
  } else if (!unknown && requested.length && available.length) {
    const unusualDays =
      /sabado|domingo|rotativ|nocturn/.test(schedule) &&
      !/sabado|domingo|rotativ|nocturn/.test(availability);
    const fits = ([start, end]) =>
      available.some(([a, b]) => a <= start && b >= end);
    const alternatives = /\so\s/i.test(o.horario || "");
    if (
      !unusualDays &&
      (alternatives ? requested.some(fits) : requested.every(fits))
    ) {
      score = 100;
      matches.push(
        "La franja horaria publicada está contenida en tu disponibilidad. Confirmá los días.",
      );
    } else if (
      !unusualDays &&
      requested.some(([s, e]) =>
        available.some(([a, b]) => Math.max(a, s) < Math.min(b, e)),
      )
    ) {
      score = 50;
      review.push("Las franjas horarias coinciden solo parcialmente.");
    } else
      review.push(
        "El horario o los días especiales no coinciden con la disponibilidad indicada.",
      );
  } else
    review.push(
      unknown
        ? "La oferta no informa horario; este criterio se excluye del cálculo."
        : "No se pudo comparar el horario. Usá una franja como 09:00 a 18:00 o Flexible.",
    );
  return criterion(score, !unknown, matches, review);
}

export function calculateModalityScore(profile, offer) {
  const p = profile || {}, o = offer || {}, matches = [], review = [];
  const modality = normalize(o.modalidad);
  const available = Boolean(modality && modality !== "no informado");
  let score = 0;
  if (
    normalize(p.modalidad_preferida) &&
    normalize(p.modalidad_preferida) === normalize(o.modalidad)
  ) {
    score = 100;
    matches.push("La modalidad coincide.");
  } else if (available)
    review.push(
      "La modalidad no coincide o no está definida.",
    );
  else review.push("La oferta no informa modalidad; este criterio se excluye del cálculo.");
  return criterion(score, available, matches, review);
}

export function calculateSalaryScore(profile, offer) {
  const preference = profile?.matching_preferences || {};
  const desired = Number(preference.salaryMinimum);
  const minimum = Number(offer?.salario_min);
  const maximum = Number(offer?.salario_max);
  const amount = Number.isFinite(maximum) && maximum > 0 ? maximum : minimum;
  const comparable =
    Number.isFinite(desired) && desired > 0 &&
    Number.isFinite(amount) && amount > 0 &&
    offer?.moneda && preference.salaryCurrency === offer.moneda &&
    offer?.periodicidad_salario &&
    preference.salaryPeriodicity === offer.periodicidad_salario;
  if (!comparable) return criterion(0, false);
  return criterion(Math.min(100, (amount / desired) * 100), true);
}

export function calculateFinalMatch(scores, inputWeights) {
  const weights = normalizeWeights(inputWeights);
  const active = MATCHING_WEIGHT_KEYS.filter(
    (key) => scores[key]?.available && weights[key] > 0,
  );
  const activeWeight = active.reduce((sum, key) => sum + weights[key], 0);
  const criteria = {};
  let total = 0;
  for (const key of MATCHING_WEIGHT_KEYS) {
    const item = scores[key];
    const effectiveWeight =
      item?.available && weights[key] > 0 && activeWeight > 0
        ? (weights[key] / activeWeight) * 100
        : 0;
    const contribution = item?.available
      ? (item.score * effectiveWeight) / 100
      : 0;
    total += contribution;
    criteria[key] = {
      available: Boolean(item?.available),
      score: item?.available ? Math.round(item.score * 100) / 100 : null,
      weight: weights[key],
      effectiveWeight: Math.round(effectiveWeight * 100) / 100,
      contribution: Math.round(contribution * 100) / 100,
    };
  }
  return { score: Math.min(100, Math.max(0, Math.round(total))), weights, criteria };
}

export function calculateMatch(profile, offer, inputWeights) {
  const p = profile || {}, o = offer || {};
  const scores = {
    area: calculateAreaScore(p, o),
    skills: calculateSkillScore(p, o),
    formacion: calculateCareerScore(p, o),
    jornada: calculateWorkloadScore(p, o),
    horario: calculateScheduleScore(p, o),
    modalidad: calculateModalityScore(p, o),
    salario: calculateSalaryScore(p, o),
  };
  const configured =
    inputWeights || p.matching_preferences?.weights || DEFAULT_MATCHING_WEIGHTS;
  const final = calculateFinalMatch(scores, configured);
  const matches = Object.values(scores).flatMap((item) => item.matches || []);
  const review = Object.values(scores).flatMap((item) => item.review || []);
  const requirements = normalize(o.requisitos);
  if (/\bexperiencia\b/.test(requirements))
    review.push(
      "Revisá la experiencia solicitada: esta regla no interpreta automáticamente tu resumen ni tu CV.",
    );
  const breakdown = Object.fromEntries(
    Object.entries(DEFAULT_MATCHING_WEIGHTS)
      .filter(([key]) => key !== "salario")
      .map(([key, weight]) => [
        key,
        scores[key].available
          ? Math.round(((scores[key].score * weight) / 100) * 100) / 100
          : 0,
      ]),
  );
  return {
    score: final.score,
    breakdown,
    criteria: final.criteria,
    weights: final.weights,
    matches,
    review,
    requiredSkills: scores.skills.requiredSkills,
    matchedSkills: scores.skills.matchedSkills,
  };
}
export function rankOffers(offers, profile) {
  return offers
    .map((o) => ({ ...o, match: calculateMatch(profile, o) }))
    .sort(
      (a, b) => b.match.score - a.match.score || Number(a.id) - Number(b.id),
    );
}
