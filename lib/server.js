import { createClient } from "@supabase/supabase-js";
export async function authorize(req, res, requiredRole = "estudiante") {
  res.setHeader("Cache-Control", "private, no-store");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    res
      .status(503)
      .json({ error: "La aplicación necesita completar su configuración." });
    return null;
  }
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
  if (!match) {
    res.status(401).json({ error: "Iniciá sesión para continuar." });
    return null;
  }
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });
  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user || data.user.is_anonymous) {
    res
      .status(401)
      .json({ error: "Tu sesión no es válida. Volvé a iniciar sesión." });
    return null;
  }
  const { data: role, error: roleError } = await client.rpc("rol_actual");
  if (roleError) {
    res.status(503).json({ error: "No se pudo verificar tu acceso." });
    return null;
  }
  if (requiredRole && role !== requiredRole) {
    res.status(403).json({ error: "No tenés acceso a esta función." });
    return null;
  }
  return { client, user: data.user, role };
}
