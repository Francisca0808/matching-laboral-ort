# Matching Laboral ORT

MVP académico para estudiantes. Perfil privado, CV privado y recomendaciones explicables sobre 111 ofertas del portal ORT. El administrador mantiene ofertas y no accede a perfiles, CV ni rankings de estudiantes.

## Ejecutar localmente

Node 24 y pnpm 10.17.1. Copiar `.env.example` a `.env.local` y completar las variables públicas de Supabase. El análisis de CV funciona localmente y no requiere una clave de IA.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

`build` ejecuta lint, las pruebas automatizadas y la compilación Next.js. `pnpm dev` inicia desarrollo. No se requieren claves privilegiadas.

## Flujo

1. Registrarse con correo y contraseña y confirmar el correo.
2. Iniciar sesión, completar el perfil y guardar.
3. Subir o reemplazar un CV PDF o DOCX de hasta 4 MB.
4. Revisar, editar y seleccionar la información detectada antes de incorporarla al formulario y guardar el perfil.
5. Elegir pesos recomendados o personalizar la importancia de skills, área, formación, modalidad, jornada y horario.
6. Consultar ofertas ordenadas por afinidad, buscar y filtrar modalidad o jornada.
7. Abrir el detalle, revisar el aporte de cada criterio y visitar la oferta original.
8. Guardar, descartar o recuperar ofertas. Las elecciones persisten por estudiante.

Las ofertas son datos reales importados. Su vigencia debe confirmarse en la publicación original. El porcentaje expresa coincidencias de reglas, no probabilidad de contratación.

## Arquitectura y seguridad

Next.js Pages Router, React y Supabase Auth, Postgres y Storage. Las API verifican la identidad con `getUser` y consultan usando el token de ese usuario. RLS continúa activa. El rol administrador se obtiene de una tabla privada, nunca de campos editables del perfil o de metadatos de registro.

`perfiles_estudiantes`, `documentos_estudiante` e `interacciones_ofertas` son privados por usuario. El bucket `cvs` es privado y limita el acceso a la carpeta del propietario. Las descargas usan enlaces firmados de 60 segundos.

La API extrae texto en el servidor y compara el contenido con los catálogos y aliases de Supabase. Después usa `Xenova/paraphrase-multilingual-MiniLM-L12-v2` cuantizado a 8 bits para proponer coincidencias semánticas en español. Exige una similitud mínima de 0,58 y una diferencia de 0,08 frente a la segunda opción. Las sugerencias con menos de 0,70 quedan desmarcadas para revisión. Si el modelo no carga, continúa con coincidencias exactas. El texto no sale hacia una API de IA, no se guarda completo y no se escribe en logs. La respuesta queda como sugerencia privada en `documentos_estudiante`; ningún dato se incorpora al perfil hasta que el estudiante lo selecciona y guarda. Los valores desconocidos permanecen como texto revisable y no crean entradas globales.

El catálogo completo se puntúa antes de paginar, con desempate por ID. El matching usa primero `perfil_skills` y `oferta_skills`; consulta requisitos en texto solo cuando la oferta no tiene clasificación estructurada. Cada estudiante puede guardar una configuración uno a uno en `preferencias_matching`. Si no existe esa fila se usan los pesos históricos. Los criterios sin datos en una oferta se excluyen y el peso se redistribuye entre los evaluables. La IA no calcula el porcentaje. Consultar [reglas del matching](docs/matching.md), [estado y pruebas](docs/estado.md) y [publicación y administrador](docs/publicacion.md).

## Base de datos

Las migraciones iniciales están documentadas en `docs/mvp_database.sql` y `docs/mvp_completo.sql`. La normalización vigente está en `supabase/migrations/20261001130000_normalizar_arquitectura.sql`, la configuración de pesos en `supabase/migrations/20261015130212_preferencias_matching.sql` y su MER en `docs/mer.md`. Se conservaron las 111 ofertas.

## Verificación

`node --env-file=.env.local scripts/check-connection.mjs` comprueba conexión y bloqueo anónimo sin crear cuentas.

Las pruebas de integración requieren tres cuentas de prueba confirmadas: dos estudiantes y un administrador. `TEST_USERS_FILE` apunta a un JSON privado con un array de objetos `{id,email,password}` en ese orden. Nunca guardarlo en Git. Ejecutar con `TEST_BASE_URL` para elegir local o producción:

```sh
TEST_BASE_URL=http://127.0.0.1:3000 TEST_USERS_FILE=/ruta/usuarios-prueba.json node --env-file=.env.local scripts/verify-live.mjs
```

Estas pruebas escriben perfiles de prueba, reemplazan el CV del primer usuario, crean y eliminan una oferta temporal y cierran las sesiones. Usar solamente cuentas descartables; eliminarlas al terminar desde la administración autorizada de Supabase. El envío y confirmación de correo real se verifica aparte.
