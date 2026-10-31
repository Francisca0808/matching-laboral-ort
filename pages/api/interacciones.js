import { authorize } from "../../lib/server";
import { validId } from "../../lib/validation.mjs";
export default async function handler(req, res) {
  if (!["PUT", "DELETE"].includes(req.method))
    return res.status(405).json({ error: "Método no permitido." });
  try {
    const auth = await authorize(req, res);
    if (!auth) return;
    let id;
    try {
      id = validId(req.body?.oferta_id);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (req.method === "DELETE") {
      const { error } = await auth.client
        .from("interacciones_ofertas")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("oferta_id", id);
      if (error) throw error;
    } else {
      if (!["guardada", "descartada"].includes(req.body.estado))
        return res.status(400).json({ error: "Estado inválido." });
      const { data, error } = await auth.client
        .from("ofertas_laborales")
        .select("id")
        .eq("id", id)
        .eq("estado", "activa")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return res
          .status(404)
          .json({ error: "La oferta ya no está disponible." });
      const write = await auth.client
        .from("interacciones_ofertas")
        .upsert(
          {
            user_id: auth.user.id,
            oferta_id: id,
            estado: req.body.estado,
            fecha_actualizacion: new Date().toISOString(),
          },
          { onConflict: "user_id,oferta_id" },
        );
      if (write.error) throw write.error;
    }
    return res.json({ ok: true });
  } catch {
    return res
      .status(502)
      .json({ error: "No se pudo guardar el cambio. Intentá nuevamente." });
  }
}
