import {
  catalogOptions,
  filterOpportunities,
} from "../../lib/opportunities.mjs";
import { authorize } from "../../lib/server";
import { offerFilters } from "../../lib/validation.mjs";
import { rankOffers } from "../../lib/matching.mjs";
import { hydrateOffers, hydrateProfile } from "../../lib/normalized";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }
  try {
    const auth = await authorize(req, res);
    if (!auth) return;
    let f;
    try {
      f = offerFilters(req.query);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const view = req.query.view || "recommended",
      jornada = req.query.jornada || "";
    if (
      !["recommended", "saved", "discarded"].includes(view) ||
      !["", "Part-time", "Full-time", "Indistinto", "No informado"].includes(
        jornada,
      )
    )
      return res.status(400).json({ error: "Filtros inválidos." });
    const [
      { data: profile, error: pError },
      { data: interactions, error: iError },
    ] = await Promise.all([
      auth.client
        .from("perfiles_estudiantes")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      auth.client
        .from("interacciones_ofertas")
        .select("oferta_id,estado")
        .eq("user_id", auth.user.id),
    ]);
    if (pError || iError) throw new Error();
    // Fetch every candidate before ranking; paging before scoring would rank only a subset.
    const offers = [];
    for (let offset = 0; ; offset += 500) {
      const q = auth.client
        .from("ofertas_laborales")
        .select(
          "id,id_ort,puesto,descripcion,requisitos,horario,jornada,modalidad,tipo_contrato,enlace,facultades,plazo_contratacion",
        )
        .eq("estado", "activa")
        .order("id");
      const { data, error } = await q.range(offset, offset + 499);
      if (error) throw error;
      offers.push(...data);
      if (data.length < 500) break;
    }
    const normalizedProfile = await hydrateProfile(auth.client, profile);
    const normalizedOffers = await hydrateOffers(auth.client, offers);
    const states = new Map(
      interactions.map((i) => [String(i.oferta_id), i.estado]),
    );
    const candidates = filterOpportunities(normalizedOffers, {
      ...f,
      jornada,
    }).filter(
      (o) =>
        view === "saved"
          ? states.get(String(o.id)) === "guardada"
          : view === "discarded"
            ? states.get(String(o.id)) === "descartada"
            : states.get(String(o.id)) !== "descartada",
    );
    const ranked = rankOffers(candidates, normalizedProfile).map((o) => ({
      ...o,
      interaction: states.get(String(o.id)) || null,
    }));
    return res.json({
      catalog: catalogOptions(offers),
      offers: ranked.slice((f.page - 1) * f.size, f.page * f.size),
      total: ranked.length,
      page: f.page,
      pageSize: f.size,
      profileComplete: !!(profile?.carrera && profile?.areas_interes?.length),
    });
  } catch {
    return res.status(502).json({
      error: "No se pudieron cargar las recomendaciones. Intentá nuevamente.",
    });
  }
}
