export const modalities = [
  "Presencial",
  "Híbrida",
  "Remota",
  "Sin preferencia",
];
export function validateProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Perfil inválido.");
  const out = {};
  for (const [name, max] of Object.entries({
    nombre: 80,
    apellido: 80,
    carrera: 120,
    disponibilidad_horaria: 200,
  })) {
    if (
      typeof input[name] !== "string" ||
      !input[name].trim() ||
      input[name].trim().length > max
    )
      throw new Error(
        "Completá nombre, apellido, carrera y disponibilidad con valores válidos.",
      );
    out[name] = input[name].trim();
  }
  for (const [name, max] of [
    ["anio_carrera", 10],
    ["horas_semanales", 60],
  ]) {
    if (!Number.isInteger(input[name]) || input[name] < 1 || input[name] > max)
      throw new Error("Revisá el año de carrera y las horas semanales.");
    out[name] = input[name];
  }
  if (!modalities.includes(input.modalidad_preferida))
    throw new Error("Seleccioná una modalidad válida.");
  out.modalidad_preferida = input.modalidad_preferida;
  if (
    !Array.isArray(input.areas_interes) ||
    input.areas_interes.length < 1 ||
    input.areas_interes.length > 12 ||
    input.areas_interes.some(
      (x) => typeof x !== "string" || !x.trim() || x.trim().length > 80,
    )
  )
    throw new Error(
      "Ingresá entre 1 y 12 intereses, de hasta 80 caracteres cada uno.",
    );
  out.areas_interes = [...new Set(input.areas_interes.map((x) => x.trim()))];
  for (const field of ["skills", "idiomas"]) {
    const list = input[field] ?? [];
    if (
      !Array.isArray(list) ||
      list.length > 30 ||
      list.some((x) => typeof x !== "string" || !x.trim() || x.length > 80)
    )
      throw new Error("Revisá las habilidades y los idiomas.");
    out[field] = [...new Set(list.map((x) => x.trim()))];
  }
  if (
    typeof (input.experiencia_resumen ?? "") !== "string" ||
    (input.experiencia_resumen ?? "").length > 3000
  )
    throw new Error("El resumen de experiencia admite hasta 3000 caracteres.");
  out.experiencia_resumen = (input.experiencia_resumen ?? "").trim();
  return out;
}
export function offerFilters(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new Error("Página inválida.");
  const search = query.search ?? "";
  const modality = query.modality ?? "";
  if (
    typeof search !== "string" ||
    search.length > 100 ||
    typeof modality !== "string" ||
    (modality && !modalities.slice(0, 3).includes(modality))
  )
    throw new Error("Filtros inválidos.");
  const faculties =
    query.faculty === undefined
      ? []
      : Array.isArray(query.faculty)
        ? query.faculty
        : [query.faculty];
  if (
    faculties.length > 20 ||
    faculties.some((x) => typeof x !== "string" || x.length > 120)
  )
    throw new Error("Facultades inválidas.");
  return {
    page,
    faculties: [...new Set(faculties.map((x) => x.trim()).filter(Boolean))],
    search: search.trim(),
    modality,
    size: 12,
  };
}
export function safeOfferLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
export function validId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("Identificador inválido.");
  return id;
}
export function validateOffer(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Oferta inválida.");
  const result = {};
  for (const field of [
    "id_ort",
    "puesto",
    "descripcion",
    "requisitos",
    "horario",
    "jornada",
    "modalidad",
    "tipo_contrato",
    "enlace",
    "facultades",
    "tipo_cargo",
    "plazo_contratacion",
    "estado",
  ]) {
    const value = input[field] ?? "";
    if (
      typeof value !== "string" ||
      value.length >
        (["descripcion", "requisitos"].includes(field) ? 20000 : 500)
    )
      throw new Error("Revisá el contenido de la oferta.");
    result[field] = value.trim();
  }
  if (!result.puesto || !result.id_ort)
    throw new Error("Puesto e ID ORT son obligatorios.");
  if (!["activa", "inactiva"].includes(result.estado))
    throw new Error("Estado inválido.");
  if (
    !["Presencial", "Híbrida", "Remota", "No informado"].includes(
      result.modalidad,
    )
  )
    throw new Error("Modalidad inválida.");
  if (
    !["Part-time", "Full-time", "Indistinto", "No informado"].includes(
      result.jornada,
    )
  )
    throw new Error("Jornada inválida.");
  if (!safeOfferLink(result.enlace))
    throw new Error(
      "Ingresá un enlace HTTPS válido a la publicación original.",
    );
  return result;
}
