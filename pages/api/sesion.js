import { authorize } from "../../lib/server";
export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Método no permitido." });
  try {
    const auth = await authorize(req, res, null);
    if (auth) res.json({ role: auth.role });
  } catch {
    res.status(502).json({ error: "No se pudo verificar tu sesión." });
  }
}
