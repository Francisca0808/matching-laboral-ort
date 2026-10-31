import { authorize } from "../../lib/server";
import { validId, validateOffer } from "../../lib/validation.mjs";
export default async function handler(req, res) {
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method))
    return res.status(405).json({ error: "Método no permitido." });
  try {
    const auth = await authorize(req, res, "admin");
    if (!auth) return;
    if (req.method === "GET") {
      const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
      const { data, error, count } = await auth.client
        .from("ofertas_laborales")
        .select("*", { count: "exact" })
        .order("id")
        .range((page - 1) * 50, page * 50 - 1);
      if (error) throw error;
      return res.json({ offers: data, total: count, page, pageSize: 50 });
    }
    let id, offer;
    try {
      if (req.method !== "POST") id = validId(req.body?.id);
      if (req.method !== "DELETE") offer = validateOffer(req.body);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const table = auth.client.from("ofertas_laborales");
    const { data, error } = await (
      req.method === "POST"
        ? table.insert({
            ...offer,
            creada_por: auth.user.id,
            actualizada_por: auth.user.id,
          })
        : req.method === "PUT"
          ? table
              .update({ ...offer, actualizada_por: auth.user.id })
              .eq("id", id)
          : table
              .update({
                estado: "inactiva",
                archivada_at: new Date().toISOString(),
                actualizada_por: auth.user.id,
              })
              .eq("id", id)
    ).select("id");
    if (error?.code === "23505")
      return res
        .status(409)
        .json({ error: "Ya existe una oferta con ese ID ORT." });
    if (error) throw error;
    if (!data?.length)
      return res.status(404).json({ error: "No se encontró la oferta." });
    return res.json({ ok: true, id: data[0].id });
  } catch {
    return res
      .status(502)
      .json({ error: "No se pudo completar la operación sobre la oferta." });
  }
}
export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };
