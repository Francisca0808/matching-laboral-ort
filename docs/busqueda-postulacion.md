# Mejoras de búsqueda y postulación

Publicado en https://matching-laboral-ort.vercel.app mediante despliegue `dpl_DM9W79VKD4WeG7NaqV4uS9EsePmM`.

## Implementación

1. Búsqueda por todas las palabras en el puesto, independiente de orden, mayúsculas y tildes. Se filtra el catálogo antes de puntuar y paginar, conservando el algoritmo de matching.
2. Hasta ocho sugerencias desde dos caracteres. Los 105 títulos distintos proceden de las 111 ofertas activas reales; se puede seleccionar una sugerencia o seguir escribiendo y pulsar Buscar.
3. Las cinco facultades se extraen de los valores reales separados por coma o punto y coma. La multiselección admite cualquiera de las facultades elegidas. Búsqueda, facultades, modalidad y jornada se combinan con AND. Limpiar filtros restablece controles y página.
4. Cómo postularte extrae correos y asuntos explícitos de descripción y requisitos. Se muestran también las indicaciones originales para conservar pedidos de documentos o aspiraciones salariales. En ausencia de correo se indica continuar por el portal de ORT. No hay envío de candidatura, carga automática del CV ni estado de postulado.
5. Se conserva el enlace original HTTPS. Se comprobó que la publicación de Back Office Analyst abre el portal de ORT, que redirige a su pantalla de acceso.

## Archivos

`components/Offers.js`, `components/ApplicationInstructions.js`, `lib/opportunities.mjs`, `pages/api/ofertas.js`, `lib/validation.mjs`, `public/mvp.css`, `tests/opportunities.test.mjs`, `tests/validation.test.mjs`, `scripts/verify-search.mjs` y este documento.

## Verificación

Build y lint aprobados localmente y en Vercel. 26 pruebas unitarias aprobadas, incluidas las pruebas existentes de matching y perfil.

Con las 111 ofertas reales: marketing devuelve 3; asistente marketing y marketing asistente devuelven las mismas 2. La combinación con Administración y Ciencias Sociales, Híbrida y Part-time devuelve 2. Comunicación devuelve 25 ofertas. Se detectan 105 puestos distintos, 5 facultades y 8 ofertas con correo.

En navegador: búsqueda libre, orden de palabras, autocompletado, selección de Asistente de Pago a Proveedores, facultad sola, oferta con dos facultades, combinación de cuatro criterios, limpieza, detalle de Back Office Analyst con correo y asunto, detalle de Asistente Junior de Marketing sin correo y apertura del enlace original.

La API se verificó tanto localmente como en producción mediante `scripts/verify-search.mjs`. Requiere variables TEST_EMAIL, TEST_PASSWORD y, opcionalmente, TEST_BASE_URL para una cuenta de prueba confirmada. No contiene credenciales. El catálogo y las configuraciones de Supabase no se modificaron.

Se compararon huellas de los archivos protegidos: matching, autorización, autenticación, perfil, CV y administrador permanecen idénticos a su estado inicial.
