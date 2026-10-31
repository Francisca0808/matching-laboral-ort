import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProfile,
  offerFilters,
  safeOfferLink,
} from "../lib/validation.mjs";
const profile = {
  nombre: " Ana ",
  apellido: "Pérez",
  carrera: "Negocios Digitales",
  anio_carrera: 2,
  areas_interes: ["Datos", "Datos"],
  disponibilidad_horaria: "Tardes",
  horas_semanales: 20,
  modalidad_preferida: "Híbrida",
};
test("perfil normalizado y sin campos de identidad controlados por el cliente", () => {
  const result = validateProfile({
    ...profile,
    user_id: "otro",
    id: "otro",
    cv_path: "privado",
  });
  assert.equal(result.nombre, "Ana");
  assert.deepEqual(result.areas_interes, ["Datos"]);
  assert.equal(result.user_id, undefined);
  assert.equal(result.id, undefined);
  assert.equal(result.cv_path, undefined);
});
test("rechaza perfiles incompletos, horas y años fuera de rango", () => {
  for (const change of [
    { nombre: " " },
    { horas_semanales: 0 },
    { horas_semanales: 61 },
    { anio_carrera: 1.5 },
    { areas_interes: [] },
    { areas_interes: ["x".repeat(81)] },
    { modalidad_preferida: "Otra" },
  ])
    assert.throws(() => validateProfile({ ...profile, ...change }));
});
test("paginación limitada y filtros validados", () => {
  assert.equal(offerFilters({}).size, 12);
  for (const page of ["-1", "0", "1.5", "NaN", "10001"])
    assert.throws(() => offerFilters({ page }));
  assert.throws(() => offerFilters({ modality: "Otra" }));
  assert.throws(() => offerFilters({ search: ["uno", "dos"] }));
  assert.equal(offerFilters({ search: "50%_" }).search, "50%_");
});
test("solo permite enlaces HTTPS en ofertas", () => {
  assert.equal(safeOfferLink("javascript:alert(1)"), null);
  assert.equal(safeOfferLink("http://example.com"), null);
  assert.equal(
    safeOfferLink("https://example.com/empleo"),
    "https://example.com/empleo",
  );
});
