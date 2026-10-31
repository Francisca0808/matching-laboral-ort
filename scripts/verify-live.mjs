import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const users = JSON.parse(fs.readFileSync(process.env.TEST_USERS_FILE || "/private/tmp/ort-qa.json", "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const clients = [],
  tokens = [];
const passed = [];
function pass(name) {
  passed.push(name);
  console.log("PASS " + name);
}
async function api(path, options = {}, index = 0) {
  const r = await fetch(base + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(tokens[index] ? { Authorization: "Bearer " + tokens[index] } : {}),
      ...options.headers,
    },
  });
  return { status: r.status, body: await r.json() };
}
for (const u of users) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: u.email,
    password: u.password,
  });
  assert.ifError(error);
  clients.push(client);
  tokens.push(data.session.access_token);
}
pass("login de dos estudiantes y administrador");
for (const route of [
  "/api/perfil",
  "/api/ofertas",
  "/api/sesion",
  "/api/cv",
  "/api/admin",
]) {
  const r = await fetch(base + route);
  assert.equal(r.status, 401);
}
pass("rutas privadas rechazan solicitudes sin sesión");
assert.equal((await api("/api/sesion")).body.role, "estudiante");
assert.equal((await api("/api/sesion", {}, 2)).body.role, "admin");
pass("roles verificados desde base");
const profile = {
  nombre: "Estudiante QA",
  apellido: "Prueba",
  carrera: "Licenciatura en Sistemas",
  anio_carrera: 3,
  areas_interes: ["datos", "software"],
  skills: ["Excel", "SQL", "Python"],
  idiomas: ["Inglés"],
  experiencia_resumen: "Perfil temporal de pruebas.",
  disponibilidad_horaria: "08:00 a 19:00",
  horas_semanales: 30,
  modalidad_preferida: "Híbrida",
};
let r = await api("/api/perfil", {
  method: "PUT",
  body: JSON.stringify(profile),
});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.profile.skills, profile.skills);
r = await api("/api/perfil");
assert.equal(r.body.profile.nombre, profile.nombre);
pass("guardar y volver a leer perfil completo");
await clients[0].auth.signOut();
const login = await clients[0].auth.signInWithPassword({
  email: users[0].email,
  password: users[0].password,
});
assert.ifError(login.error);
tokens[0] = login.data.session.access_token;
r = await api("/api/perfil");
assert.equal(r.body.profile.experiencia_resumen, profile.experiencia_resumen);
pass("persistencia después de cerrar sesión y volver a entrar");
r = await api("/api/ofertas");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.total, 111);
let all = [...r.body.offers];
for (let page = 2; page <= Math.ceil(r.body.total / r.body.pageSize); page++) {
  const next = await api("/api/ofertas?page=" + page);
  assert.equal(next.status, 200);
  all.push(...next.body.offers);
}
assert.equal(all.length, 111);
assert.equal(new Set(all.map((x) => x.id)).size, 111);
assert.ok(
  all.every(
    (o, i) =>
      o.match.score >= 0 &&
      o.match.score <= 100 &&
      (i === 0 || all[i - 1].match.score >= o.match.score),
  ),
);
assert.ok(
  all.every(
    (o) => Array.isArray(o.match.matches) && Array.isArray(o.match.review),
  ),
);
pass("111 ofertas únicas, score 0 a 100, explicación y orden global");
assert.ok(all.every((o) => new URL(o.enlace).protocol === "https:"));
pass("111 enlaces originales HTTPS");
const first = all[0];
r = await api("/api/ofertas?modality=Remota&jornada=Part-time");
assert.ok(
  r.body.offers.every(
    (x) => x.modalidad === "Remota" && x.jornada === "Part-time",
  ),
);
r = await api("/api/ofertas?search=Analista");
assert.ok(
  r.body.offers.length > 0 &&
    r.body.offers.every((x) => x.puesto.toLowerCase().includes("analista")),
);
pass("búsqueda y filtros");
r = await api("/api/interacciones", {
  method: "PUT",
  body: JSON.stringify({ oferta_id: first.id, estado: "guardada" }),
});
assert.equal(r.status, 200);
await api("/api/interacciones", {
  method: "PUT",
  body: JSON.stringify({ oferta_id: first.id, estado: "guardada" }),
});
r = await api("/api/ofertas?view=saved");
assert.equal(r.body.total, 1);
assert.equal(r.body.offers[0].id, first.id);
pass("guardar oferta y evitar duplicados");
r = await api("/api/interacciones", {
  method: "PUT",
  body: JSON.stringify({ oferta_id: first.id, estado: "descartada" }),
});
assert.equal(r.status, 200);
assert.equal((await api("/api/ofertas?view=saved")).body.total, 0);
assert.equal((await api("/api/ofertas")).body.total, 110);
assert.equal((await api("/api/ofertas?view=discarded")).body.total, 1);
await api("/api/interacciones", {
  method: "DELETE",
  body: JSON.stringify({ oferta_id: first.id }),
});
assert.equal((await api("/api/ofertas")).body.total, 111);
pass("descartar, consultar descartadas y recuperar");
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
);
for (let i = 0; i < 2; i++) {
  r = await api("/api/cv", {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: pdf,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
}
r = await api("/api/perfil");
assert.equal(r.body.profile.cv_path, users[0].id + "/cv.pdf");
const cv = await api("/api/cv");
assert.equal(cv.status, 200);
const download = await fetch(cv.body.url);
assert.equal(download.status, 200);
pass("subir, reemplazar, referenciar y descargar CV privado");
r = await api("/api/cv", {
  method: "PUT",
  headers: { "Content-Type": "application/pdf" },
  body: "not a pdf",
});
assert.equal(r.status, 400);
pass("rechazar archivo que no es PDF");
const otherProfile = await clients[1]
  .from("perfiles_estudiantes")
  .select("*")
  .eq("user_id", users[0].id);
assert.ifError(otherProfile.error);
assert.equal(otherProfile.data.length, 0);
const otherCv = await clients[1].storage
  .from("cvs")
  .download(users[0].id + "/cv.pdf");
assert.ok(otherCv.error);
const otherInteraction = await clients[1]
  .from("interacciones_ofertas")
  .upsert({ user_id: users[0].id, oferta_id: first.id, estado: "guardada" });
assert.ok(otherInteraction.error);
pass("aislamiento de perfil, CV e interacciones entre estudiantes");
const original = all[0].puesto;
const denied = await clients[0]
  .from("ofertas_laborales")
  .update({ puesto: "NO CAMBIAR" })
  .eq("id", first.id)
  .select("id");
assert.ok(denied.error || denied.data.length === 0);
assert.equal(
  (
    await clients[0]
      .from("ofertas_laborales")
      .select("puesto")
      .eq("id", first.id)
      .single()
  ).data.puesto,
  original,
);
assert.equal((await api("/api/admin")).status, 403);
pass("estudiante no modifica ofertas ni accede al panel administrador");
const adminProfile = await clients[2].from("perfiles_estudiantes").select("*");
assert.ifError(adminProfile.error);
assert.equal(adminProfile.data.length, 0);
assert.ok(
  (await clients[2].storage.from("cvs").download(users[0].id + "/cv.pdf"))
    .error,
);
assert.equal((await api("/api/perfil", {}, 2)).status, 403);
assert.equal((await api("/api/ofertas", {}, 2)).status, 403);
pass("administrador sin perfiles, CV ni rankings de estudiantes");
const testOffer = {
  id_ort: "QA-" + crypto.randomUUID(),
  puesto: "Oferta temporal QA",
  descripcion: "Prueba de administración",
  requisitos: "SQL",
  horario: "09:00 a 18:00",
  modalidad: "Remota",
  jornada: "Part-time",
  enlace: "https://www.ort.edu.uy/",
  estado: "inactiva",
};
r = await api(
  "/api/admin",
  { method: "POST", body: JSON.stringify(testOffer) },
  2,
);
assert.equal(r.status, 200, JSON.stringify(r.body));
const id = r.body.id;
try {
  assert.equal((await api("/api/admin", {}, 2)).status, 200);
  assert.equal(
    (
      await api(
        "/api/admin",
        {
          method: "PUT",
          body: JSON.stringify({
            ...testOffer,
            id,
            puesto: "Oferta QA editada",
          }),
        },
        2,
      )
    ).status,
    200,
  );
} finally {
  assert.equal(
    (
      await api(
        "/api/admin",
        { method: "DELETE", body: JSON.stringify({ id }) },
        2,
      )
    ).status,
    200,
  );
  const archived = await clients[2]
    .from("ofertas_laborales")
    .select("estado,archivada_at")
    .eq("id", id)
    .single();
  assert.ifError(archived.error);
  assert.equal(archived.data.estado, "inactiva");
  assert.ok(archived.data.archivada_at);
  const cleanup = await clients[2]
    .from("ofertas_laborales")
    .delete()
    .eq("id", id);
  assert.ifError(cleanup.error);
}
pass("administrador crea, revisa, edita y archiva oferta de prueba");
await clients[0].storage.from("cvs").remove([users[0].id + "/cv.pdf"]);
for (const client of clients) await client.auth.signOut();
pass("cierre de sesiones de prueba");
fs.mkdirSync("qa-output", { recursive: true });
fs.writeFileSync(
  "qa-output/live-results.json",
  JSON.stringify(
    {
      passed,
      date: new Date().toISOString(),
      registration:
        "Bloqueado: Supabase rechaza dominio reservado; confirmar envío con correo real.",
    },
    null,
    2,
  ),
);
console.log(
  "TOTAL " + passed.length + " verificaciones de integración aprobadas",
);
