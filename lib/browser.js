import { createClient } from "@supabase/supabase-js";
let client;
export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}
export async function api(path, options = {}) {
  const client = getSupabase();
  if (!client)
    throw new Error("La aplicación necesita completar su configuración.");
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error("Iniciá sesión para continuar.");
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${data.session.access_token}`,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "No se pudo completar la operación.");
  return result;
}
