import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await client.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
assert.ifError(error);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
async function read(params = {}) {
  const q = new URLSearchParams(params);
  const r = await fetch(`${base}/api/ofertas?${q}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  assert.equal(r.status, 200);
  return r.json();
}
const all = await read();
assert.equal(all.total, 111);
assert.equal(all.catalog.faculties.length, 5);
const marketing = await read({ search: "marketing" });
assert.equal(marketing.total, 3);
const a = await read({ search: "asistente marketing" }),
  b = await read({ search: "marketing asistente" });
assert.equal(a.total, 2);
assert.deepEqual(
  a.offers.map((o) => o.id),
  b.offers.map((o) => o.id),
);
const accent = await read({ search: "ASISTENTE MÁRKETING" });
assert.deepEqual(
  accent.offers.map((o) => o.id),
  a.offers.map((o) => o.id),
);
const combined = await read({
  search: "asistente marketing",
  faculty: "Administración y Ciencias Sociales",
  modality: "Híbrida",
  jornada: "Part-time",
});
assert.equal(combined.total, 2);
const faculty = await read({ faculty: "Comunicación" });
assert.ok(faculty.total > 0);
assert.ok(
  faculty.offers.every((o) =>
    o.facultades
      .split(",")
      .map((x) => x.trim())
      .includes("Comunicación"),
  ),
);
const selected = await read({
  search: all.catalog.titles.find((t) => t === "Asistente Junior de Marketing"),
});
assert.equal(selected.total, 1);
assert.equal((await read()).total, 111);
assert.ok(a.offers.every((o) => o.match.score >= 0 && o.match.score <= 100));
console.log(
  JSON.stringify({
    base,
    offers: all.total,
    marketing: marketing.total,
    multiword: a.total,
    combined: combined.total,
    faculty: faculty.total,
    suggestions: all.catalog.titles.length,
    checks: "PASS",
  }),
);
