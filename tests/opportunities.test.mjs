import test from "node:test";
import assert from "node:assert/strict";
import {
  matchesTitle,
  catalogOptions,
  titleSuggestions,
  filterOpportunities,
  applicationInstructions,
} from "../lib/opportunities.mjs";
import { offerFilters } from "../lib/validation.mjs";
const offers = [
  {
    puesto: "Asistente Junior de Marketing",
    facultades: "Administración y Ciencias Sociales, Comunicación",
    modalidad: "Híbrida",
    jornada: "Part-time",
  },
  {
    puesto: "Asistente de Marketing y Comunicación Visual",
    facultades: "Comunicación, Diseño",
    modalidad: "Presencial",
    jornada: "Full-time",
  },
  {
    puesto: "Asistente Contable",
    facultades: "Administración y Ciencias Sociales",
    modalidad: "Híbrida",
    jornada: "Part-time",
  },
];
test("búsqueda AND por palabras sin orden, mayúsculas ni tildes", () => {
  for (const q of [
    "asistente marketing",
    "marketing asistente",
    " ASISTENTE  Márketing ",
  ])
    assert.deepEqual(
      filterOpportunities(offers, { search: q }),
      offers.slice(0, 2),
    );
  assert.equal(matchesTitle(offers[0].puesto, "asistente ventas"), false);
  assert.equal(filterOpportunities(offers, { search: "" }).length, 3);
  assert.equal(matchesTitle("50% de jornada", "50%"), true);
});
test("sugerencias reales, sin duplicados y limitadas", () => {
  const options = catalogOptions([...offers, offers[0]]);
  assert.equal(options.titles.length, 3);
  assert.equal(titleSuggestions(options.titles, "asis").length, 3);
  assert.deepEqual(titleSuggestions(options.titles, "x"), []);
  assert.equal(
    titleSuggestions(
      Array.from({ length: 20 }, (_, i) => `Asistente ${i}`),
      "asis",
    ).length,
    8,
  );
});
test("facultad separada, multiselección OR y filtros combinados AND", () => {
  assert.equal(
    filterOpportunities(offers, { faculties: ["Comunicación"] }).length,
    2,
  );
  assert.equal(
    filterOpportunities(offers, {
      faculties: ["Comunicación", "Administración y Ciencias Sociales"],
    }).length,
    3,
  );
  assert.deepEqual(
    filterOpportunities(offers, {
      search: "marketing asistente",
      faculties: ["Administración y Ciencias Sociales"],
      modality: "Híbrida",
      jornada: "Part-time",
    }),
    [offers[0]],
  );
  assert.equal(
    filterOpportunities(offers, { faculties: ["Ciencias"] }).length,
    0,
  );
  assert.equal(catalogOptions(offers).faculties.length, 3);
});
test("valida facultades repetidas y límites", () => {
  assert.deepEqual(
    offerFilters({ faculty: ["Comunicación", "Comunicación"] }).faculties,
    ["Comunicación"],
  );
  assert.throws(() => offerFilters({ faculty: [{}] }));
  assert.throws(() => offerFilters({ faculty: "x".repeat(121) }));
});
test("correo con asunto explícito y datos concatenados del catálogo", () => {
  const result = applicationInstructions({
    descripcion:
      "Postulá enviando tu CV a: recepcion@delec.com.uyAsunto del mail: “Recepcionista / Comunicaciones”Somos una empresa.",
  });
  assert.deepEqual(result.emails, ["recepcion@delec.com.uy"]);
  assert.equal(result.subject, "Recepcionista / Comunicaciones");
  assert.equal(result.method, "email");
});
test("asunto sin comillas y requisitos de postulación se conservan", () => {
  const result = applicationInstructions({
    descripcion:
      "Manda tu postulacion a rrhh@Latinsecurities.uy indicando en el asunto: CV- Back Office Analyst e incluyendo aspiraciones salariales.",
  });
  assert.equal(result.subject, "CV- Back Office Analyst");
  assert.match(result.excerpt, /aspiraciones salariales/);
});
test("correo en requisitos y asunto escapado", () => {
  const result = applicationInstructions({
    requisitos:
      'Enviá tu CV a talent@delto.com con asunto \\"Product Engineer PS\\".',
  });
  assert.equal(result.subject, "Product Engineer PS");
  assert.deepEqual(result.emails, ["talent@delto.com"]);
});
test("sin correo remite al portal sin inventar datos", () => {
  assert.deepEqual(
    applicationInstructions({ descripcion: "Revisá la oferta." }),
    { method: "portal", emails: [], subject: null, excerpt: null },
  );
});

test("separa correo de responsabilidades concatenadas", () => {
  assert.deepEqual(
    applicationInstructions({
      descripcion:
        "Enviar CV a rrhh@puentenet.com.uyResponsabilidades del cargo",
    }).emails,
    ["rrhh@puentenet.com.uy"],
  );
});

test("prioriza canales de postulación normalizados", () => {
  const result = applicationInstructions({
    descripcion: "La publicación no repite el correo.",
    enlace: "https://empleo.ort.edu.uy/oferta/1",
    canales_postulacion: [
      {
        tipo: "email",
        email: "seleccion@example.com",
        asunto: "Postulación Analista",
        verificado: true,
      },
    ],
  });
  assert.equal(result.method, "email");
  assert.deepEqual(result.emails, ["seleccion@example.com"]);
  assert.equal(result.subject, "Postulación Analista");
});

test("usa facultades normalizadas para catálogo y filtros", () => {
  const normalized = [
    {
      ...offers[0],
      facultades: "texto legado incorrecto",
      facultades_normalizadas: ["Administración y Ciencias Sociales"],
    },
  ];
  assert.deepEqual(catalogOptions(normalized).faculties, [
    "Administración y Ciencias Sociales",
  ]);
  assert.equal(
    filterOpportunities(normalized, {
      faculties: ["Administración y Ciencias Sociales"],
    }).length,
    1,
  );
});
