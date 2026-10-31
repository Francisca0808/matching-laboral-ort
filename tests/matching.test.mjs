import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMatch,
  calculateFinalMatch,
  rankOffers,
  requiredSkills,
  normalize,
} from "../lib/matching.mjs";
import {
  DEFAULT_MATCHING_WEIGHTS,
  matchingPreferences,
  normalizeWeights,
} from "../lib/matching-weights.mjs";
const student = {
  areas_interes: ["Análisis de datos"],
  skills: ["Excel", "SQL"],
  idiomas: [],
  carrera: "Licenciatura en Sistemas",
  anio_carrera: 3,
  horas_semanales: 40,
  disponibilidad_horaria: "08:00 a 19:00",
  modalidad_preferida: "Híbrida",
};
const offer = {
  id: 1,
  puesto: "Analista de datos",
  descripcion: "Análisis de datos",
  requisitos: "Estudiantes de Licenciatura en Sistemas. Excel, SQL, Power BI.",
  facultades: "Ingeniería",
  jornada: "Full-time",
  horario: "09:00 a 18:00",
  modalidad: "Híbrida",
};
test("score auditable: 25 + 20 + 15 + 20 + 10 = 90", () => {
  const m = calculateMatch(student, offer);
  assert.equal(m.score, 90);
  assert.equal(m.breakdown.skills, 20);
  assert.ok(m.review.some((x) => x.includes("Power BI")));
  assert.ok(m.matches.some((x) => x.includes("Excel, SQL")));
});
test("100 puntos con coincidencia completa y cero sin información", () => {
  assert.equal(
    calculateMatch({ ...student, skills: ["Excel", "SQL", "Power BI"] }, offer)
      .score,
    100,
  );
  assert.equal(calculateMatch({}, {}).score, 0);
});
test("requisitos vacíos no causan división por cero ni regalan 30 puntos", () => {
  const m = calculateMatch(student, { ...offer, requisitos: "" });
  assert.equal(m.breakdown.skills, 0);
  assert.ok(Number.isFinite(m.score));
});
test("denominador depende de oferta, no de skills que declara el estudiante", () => {
  assert.equal(
    calculateMatch({ ...student, skills: ["Excel"] }, offer).breakdown.skills,
    10,
  );
  assert.equal(
    calculateMatch({ ...student, skills: ["Excel", "Excel", "Excel"] }, offer)
      .breakdown.skills,
    10,
  );
});
test("coincidencia parcial de área y normalización de acentos", () => {
  assert.equal(
    calculateMatch({ ...student, areas_interes: ["Datos financieros"] }, offer)
      .breakdown.area,
    12.5,
  );
  assert.equal(normalize("INGENIERÍA"), "ingenieria");
});
test("modalidad distinta o sin preferencia no recibe puntos", () => {
  for (const mode of ["Remota", "Sin preferencia", ""])
    assert.equal(
      calculateMatch({ ...student, modalidad_preferida: mode }, offer).breakdown
        .modalidad,
      0,
    );
});
test("20 horas no son compatibilidad completa con full time", () => {
  assert.equal(
    calculateMatch({ ...student, horas_semanales: 20 }, offer).breakdown
      .jornada,
    0,
  );
  assert.equal(
    calculateMatch(
      { ...student, horas_semanales: 20 },
      { ...offer, jornada: "Part-time" },
    ).breakdown.jornada,
    10,
  );
});
test("horario parcial, desconocido y días especiales son puntos a revisar", () => {
  assert.equal(
    calculateMatch(
      { ...student, disponibilidad_horaria: "14:00 a 20:00" },
      offer,
    ).breakdown.horario,
    5,
  );
  assert.equal(
    calculateMatch(student, { ...offer, horario: "No informado" }).breakdown
      .horario,
    0,
  );
  assert.equal(
    calculateMatch(student, { ...offer, horario: "Domingo 09:00 a 18:00" })
      .breakdown.horario,
    0,
  );
});
test("edad curricular: mínimos explícitos, avanzados y egresados", () => {
  assert.equal(
    calculateMatch(student, {
      ...offer,
      requisitos: "Licenciatura en Sistemas desde 4º año",
    }).breakdown.formacion,
    10,
  );
  assert.equal(
    calculateMatch(student, {
      ...offer,
      requisitos: "Licenciatura en Sistemas desde 2º año",
    }).breakdown.formacion,
    15,
  );
  assert.equal(
    calculateMatch(student, {
      ...offer,
      requisitos: "Estudiantes avanzados de Licenciatura en Sistemas",
    }).breakdown.formacion,
    10,
  );
});
test("no confunde Java con JavaScript ni SQLSe concatenado", () => {
  assert.deepEqual(requiredSkills("JavaScript"), ["JavaScript"]);
  assert.ok(requiredSkills("SQLSe valorará Power BI").includes("SQL"));
});
test("orden global descendente con desempate estable", () => {
  const data = rankOffers(
    [{ ...offer, id: 3 }, { ...offer, id: 2 }, { id: 1 }],
    student,
  );
  assert.deepEqual(
    data.map((x) => x.id),
    [2, 3, 1],
  );
  assert.ok(
    data.every((x, i) => i === 0 || data[i - 1].match.score >= x.match.score),
  );
});
test("CV y experiencia no alteran artificialmente el porcentaje", () => {
  assert.equal(
    calculateMatch(
      {
        ...student,
        cv_path: "otro.pdf",
        experiencia_resumen: "Experto en todo",
      },
      offer,
    ).score,
    calculateMatch(student, offer).score,
  );
});
test("licenciatura genérica no equivale a una carrera distinta", () => {
  const m = calculateMatch(
    { ...student, carrera: "Licenciatura en Sistemas" },
    {
      ...offer,
      facultades: "Comunicación",
      requisitos: "Licenciatura en Comunicación",
    },
  );
  assert.equal(m.breakdown.formacion, 0);
});

test("usa relaciones normalizadas de área, skills, idiomas y formación", () => {
  const m = calculateMatch(
    { ...student, skills: ["SQL", "Power BI"], idiomas: ["Inglés"] },
    {
    ...offer,
    descripcion: "Texto sin palabras de clasificación.",
    requisitos: "Requisitos disponibles en relaciones normalizadas.",
    facultades: "",
    areas_normalizadas: ["Análisis de datos"],
    skills_normalizadas: ["SQL", "Power BI"],
    idiomas_normalizados: ["Inglés"],
    facultades_normalizadas: ["Ingeniería"],
    carreras_normalizadas: ["Licenciatura en Sistemas"],
    },
  );
  assert.equal(m.breakdown.area, 25);
  assert.equal(m.breakdown.skills, 30);
  assert.ok(m.breakdown.formacion >= 10);
});

test("usuario sin preferencias personalizadas conserva los pesos recomendados", () => {
  const match = calculateMatch(student, offer);
  assert.deepEqual(match.weights, DEFAULT_MATCHING_WEIGHTS);
  assert.equal(match.score, 90);
});

test("normaliza pesos que no suman 100", () => {
  const weights = normalizeWeights({ skills: 60, modalidad: 20, horario: 20 });
  assert.equal(Object.values(weights).reduce((sum, value) => sum + value, 0), 100);
  assert.deepEqual(
    { skills: weights.skills, modalidad: weights.modalidad, horario: weights.horario },
    { skills: 60, modalidad: 20, horario: 20 },
  );
});

test("restablecer elimina la personalización y devuelve defaults", () => {
  assert.deepEqual(matchingPreferences(null), {
    mode: "recommended",
    weights: DEFAULT_MATCHING_WEIGHTS,
    updatedAt: null,
  });
});

test("priorizar skills y modalidad produce rankings distintos", () => {
  const skillOffer = {
    ...offer,
    id: 10,
    requisitos: "Excel",
    modalidad: "Remota",
  };
  const modalityOffer = {
    ...offer,
    id: 11,
    requisitos: "Power BI",
    modalidad: "Híbrida",
  };
  const bySkills = rankOffers([modalityOffer, skillOffer], {
    ...student,
    matching_preferences: { weights: normalizeWeights({ skills: 100 }) },
  });
  const byModality = rankOffers([skillOffer, modalityOffer], {
    ...student,
    matching_preferences: { weights: normalizeWeights({ modalidad: 100 }) },
  });
  assert.deepEqual(bySkills.map((item) => item.id), [10, 11]);
  assert.deepEqual(byModality.map((item) => item.id), [11, 10]);
});

test("priorizar horario favorece una franja compatible", () => {
  const ranked = rankOffers(
    [
      { ...offer, id: 20, horario: "20:00 a 23:00" },
      { ...offer, id: 21, horario: "09:00 a 18:00" },
    ],
    {
      ...student,
      matching_preferences: { weights: normalizeWeights({ horario: 100 }) },
    },
  );
  assert.deepEqual(ranked.map((item) => item.id), [21, 20]);
});

test("oferta sin horario redistribuye el peso entre criterios disponibles", () => {
  const match = calculateMatch(student, { ...offer, horario: "No informado" });
  assert.equal(match.criteria.horario.available, false);
  assert.equal(match.criteria.horario.contribution, 0);
  const effective = Object.values(match.criteria).reduce(
    (sum, item) => sum + item.effectiveWeight,
    0,
  );
  assert.equal(Math.round(effective), 100);
});

test("salario queda excluido cuando no hay montos comparables", () => {
  const match = calculateMatch(student, offer, normalizeWeights({ salario: 100 }));
  assert.equal(match.criteria.salario.available, false);
  assert.equal(match.criteria.salario.score, null);
  assert.equal(match.score, 0);
});

test("un criterio con peso cero no aporta al resultado", () => {
  const result = calculateFinalMatch(
    {
      skills: { available: true, score: 0 },
      modalidad: { available: true, score: 100 },
    },
    normalizeWeights({ skills: 100, modalidad: 0 }),
  );
  assert.equal(result.criteria.modalidad.contribution, 0);
  assert.equal(result.score, 0);
});

test("el score se mantiene entre 0 y 100 con todos o algunos criterios", () => {
  const complete = calculateMatch(student, offer);
  const partial = calculateMatch(student, {
    ...offer,
    horario: "No informado",
    jornada: "No informado",
  });
  for (const match of [complete, partial]) {
    assert.ok(match.score >= 0 && match.score <= 100);
    assert.equal(typeof match.criteria.skills.score, "number");
  }
});
