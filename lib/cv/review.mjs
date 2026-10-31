const unique = (values) => [
  ...new Map(
    values.filter(Boolean).map((value) => [String(value).trim().toLowerCase(), String(value).trim()]),
  ).values(),
];

export function mergeCvSuggestions(profile, suggestions, selection = {}) {
  const next = { ...profile };
  for (const field of ["nombre", "apellido", "formacion", "experiencia_resumen"])
    if (selection[field] && suggestions[field]) {
      const target = field === "formacion" ? "carrera" : field;
      next[target] = suggestions[field];
    }
  const acceptedSkills = (suggestions.skills || [])
    .filter((item) => selection.skills?.includes(item.nombre))
    .map((item) => item.nombre);
  const acceptedLanguages = (suggestions.idiomas || [])
    .filter((item) => selection.idiomas?.includes(item.nombre))
    .map((item) => item.nombre);
  next.skills = unique([...(profile.skills || []), ...acceptedSkills]);
  next.idiomas = unique([...(profile.idiomas || []), ...acceptedLanguages]);
  return next;
}
