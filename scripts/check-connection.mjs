import { createClient } from "@supabase/supabase-js";
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const settings = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
  { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } },
);
const data = await settings.json();
console.log(
  JSON.stringify({
    connection: settings.status,
    emailEnabled: data.external?.email,
    emailConfirmationRequired: !data.mailer_autoconfirm,
  }),
);
const { error } = await client.from("ofertas_laborales").select("id").limit(1);
console.log(
  JSON.stringify({ anonymousCatalogBlocked: !!error, code: error?.code }),
);
