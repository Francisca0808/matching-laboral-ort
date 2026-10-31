# Estado del MVP

## Resultado

Publicado en https://matching-laboral-ort.vercel.app. La extracción de PDF/DOCX, los aliases, la revisión y el fallback están implementados. El análisis combina reglas exactas con un modelo multilingüe local y no requiere una clave de IA. El matching admite pesos recomendados y personalizados por estudiante. El registro para estudiantes externos requiere SMTP del proyecto y la prueba de confirmación con correo real.

## Qué existía

Había estructura Next.js, registro/login/logout, perfil básico persistente, consulta de ofertas, búsqueda, modalidad, paginación y detalle. Supabase contenía 111 ofertas únicas y perfiles con RLS. Se conservó esta base. No estaban completados el CV privado, matching, interacciones ni administración.

## Qué se completó

1. Perfil con habilidades, idiomas y experiencia resumida.
2. PDF privado con carga, reemplazo y descarga temporal.
3. Matching determinístico de 0 a 100, explicación y orden global antes de paginar.
4. Guardadas y descartadas persistentes por estudiante, con recuperación.
5. Administración de ofertas y rol validado desde base.
6. Validaciones de datos, permisos y pruebas.
7. Publicación en el proyecto Vercel existente, configuración pública de Supabase y URL de retorno de Auth.
8. Extracción de texto de PDF y DOCX en backend, análisis exacto y semántico local y revisión previa por el estudiante.
9. Matching con prioridad para `perfil_skills` y `oferta_skills`, usando requisitos como respaldo cuando la oferta no tiene clasificación.
10. Pesos personalizados persistentes, normalización automática a 100 y explicación por criterio con redistribución cuando faltan datos.

## Supabase

Además de las migraciones del MVP y normalización, se aplicaron `pipeline_analisis_cv` y `preferencias_matching`. La nueva tabla tiene relación uno a uno con `perfiles_estudiantes`, borrado en cascada y RLS para lectura y escritura exclusiva del estudiante propietario.

Se corrigió el estado literal de las ofertas, se agregaron `skills`, `idiomas` y `experiencia_resumen`, `interacciones_ofertas`, tabla privada de administradores, funciones de rol y bucket privado `cvs`. RLS permanece activa. Los estudiantes leen ofertas activas, pero no las modifican. Los administradores gestionan ofertas, sin acceso a perfiles o CV de estudiantes.

Se corrigió Site URL a `https://matching-laboral-ort.vercel.app`. No se desactivó la confirmación de correo. SMTP personalizado estaba desactivado y continúa pendiente por falta de credenciales del proveedor.

## Pruebas

1. Lint y build local aprobados.
2. Las pruebas de pesos cubren defaults, normalización, prioridades distintas, datos faltantes, peso cero, límites del score y cambio de ranking.
3. Casos nuevos: PDF, DOCX, archivo ilegible, JSON inválido, Excel/SQL/Power BI, alias PowerBI y GA4, variantes de inglés, skill desconocida, perfil vacío, perfil con datos y aceptación parcial.
4. La base real mantiene 111 ofertas. Una prueba transaccional confirmó que PowerBI e English crean relaciones canónicas y que una skill desconocida no crea catálogo global.
4. Revisión visual de login, perfil, carga de CV, catálogo, detalle, explicaciones, panel administrador y formulario de oferta. Los enlaces originales están conservados; no se asegura la vigencia de las publicaciones ORT.
5. Registro: Supabase rechazó un correo de dominio reservado. Las cuentas confirmadas de integración se crearon como fixtures y no cuentan como prueba del alta y correo reales.

El asesor de seguridad no detectó problemas de RLS. Conserva una advertencia de Auth: protección contra contraseñas filtradas desactivada. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. La compilación informa que no está instalado el plugin específico de lint de Next; el lint configurado sí se ejecuta y pasa.

## Archivos principales

`pages/index.js`, `components/Profile.js`, `components/Offers.js`, `components/Admin.js`, `lib/matching.mjs`, `lib/validation.mjs`, `lib/server.js`, `pages/api/*`, `public/mvp.css`, `tests/*`, `scripts/*`, `docs/*`, `package.json` y `pnpm-lock.yaml`.

## Bloqueos y su causa comprobada

GitHub: el conector rechazó escritura con HTTP 403 `Resource not accessible by integration`. La lectura funcionó. El error acredita que esa integración no tiene acceso suficiente para esa escritura; no especifica cuál ajuste de permisos falta. También se comprobó Git local: no hay credenciales HTTPS disponibles. No se modificó el repositorio remoto.

Vercel: el conector respondió HTTP 403 indicando falta de autorización al scope `panchicosta-1052`. Se resolvió por CLI iniciando sesión y vinculando el proyecto existente. El primer despliegue detectó variables públicas no disponibles para la aplicación. Se reemplazaron los destinos Production de las dos variables públicas por valores Config correctos y se desplegó otra vez. La protección de producción fue desactivada y la aplicación quedó accesible públicamente. No se cambiaron claves privilegiadas.

Acciones manuales restantes: autenticar GitHub para subir el cambio preparado y conectar SMTP para registros externos.

## Limpieza final

Se eliminaron las tres cuentas temporales y, por cascada, sus perfiles, interacciones y rol de prueba. No quedan CV de prueba ni ofertas temporales. Las 111 ofertas originales siguen presentes. El administrador definitivo debe asignarse a una cuenta real confirmada.
