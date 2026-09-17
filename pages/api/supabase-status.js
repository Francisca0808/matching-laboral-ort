import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método no permitido.' });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response.status(503).json({ connected: false, error: 'Faltan variables de Supabase.' });
  try {
    const { error } = await createClient(url, key, { auth: { persistSession: false } }).auth.getSession();
    if (error) throw error;
    return response.status(200).json({ connected: true });
  } catch { return response.status(502).json({ connected: false, error: 'No se pudo conectar con Supabase.' }); }
}
