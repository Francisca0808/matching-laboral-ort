// Reglas de búsqueda independientes del cálculo de afinidad.
export function searchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function matchesTitle(title, query) {
  const text = searchText(title);
  return searchText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}
export function splitFaculties(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
export function catalogOptions(offers) {
  const unique = (values) =>
    [
      ...new Map(
        values.filter(Boolean).map((x) => [searchText(x), x]),
      ).values(),
    ].sort((a, b) => a.localeCompare(b, "es"));
  return {
    titles: unique(offers.map((o) => o.puesto)),
    faculties: unique(
      offers.flatMap((o) =>
        o.facultades_normalizadas?.length
          ? o.facultades_normalizadas
          : splitFaculties(o.facultades),
      ),
    ),
  };
}
export function titleSuggestions(titles, query) {
  if (searchText(query).length < 2) return [];
  return titles.filter((title) => matchesTitle(title, query)).slice(0, 8);
}
export function filterOpportunities(offers, filters) {
  const faculties = (filters.faculties || []).map(searchText);
  return offers.filter(
    (o) =>
      matchesTitle(o.puesto, filters.search) &&
      (!filters.modality || o.modalidad === filters.modality) &&
      (!filters.jornada || o.jornada === filters.jornada) &&
      (!faculties.length ||
        (o.facultades_normalizadas?.length
          ? o.facultades_normalizadas
          : splitFaculties(o.facultades)
        ).some((f) =>
          faculties.includes(searchText(f)),
        )),
  );
}
export function applicationInstructions(offer) {
  const text = [offer.descripcion, offer.requisitos]
    .filter(Boolean)
    .join("\n")
    .replace(/\\(["'])/g, "$1")
    .replace(/(\.[a-z]{2,})(?=[A-Z][a-z])/g, "$1 ");
  const emailPattern =
    /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+/gi;
  const parsedEmails = [
    ...new Set(
      (text.match(emailPattern) || []).map((x) => x.replace(/\.$/, "")),
    ),
  ];
  const structuredEmails = (offer.canales_postulacion || [])
    .filter((channel) => channel.tipo === "email" && channel.email)
    .map((channel) => channel.email);
  const emails = [...new Set([...structuredEmails, ...parsedEmails])];
  if (!emails.length) {
    const portal = (offer.canales_postulacion || []).find(
      (channel) => channel.tipo === "portal" && channel.url,
    );
    const result = {
      method: "portal",
      emails: [],
      subject: null,
      excerpt: portal?.instrucciones || null,
    };
    const url = portal?.url || offer.enlace;
    return url ? { ...result, url } : result;
  }
  const quoted = text.match(
    /asunto(?:\s+del\s+(?:mail|correo))?\s*:?\s*[“"«]([^”"»]+)[”"»]/i,
  );
  const plain = text.match(
    /asunto(?:\s+del\s+(?:mail|correo))?\s*:\s*([^\n.!?]+?)(?=\s+e\s+incluyendo|[\n.!?]|$)/i,
  );
  const index = text.indexOf(emails[0]);
  const start = Math.max(
    0,
    text.lastIndexOf(".", Math.max(0, index - 120)) + 1,
  );
  return {
    method: "email",
    emails,
    subject:
      (offer.canales_postulacion || []).find(
        (channel) => channel.tipo === "email" && channel.asunto,
      )?.asunto ||
      (quoted?.[1] || plain?.[1] || "").trim() ||
      null,
    excerpt:
      text.slice(start, Math.min(text.length, index + 350)).trim() +
      (index + 350 < text.length ? "…" : ""),
  };
}
