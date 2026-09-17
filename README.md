# Matching Laboral · ORT

Frontend básico en HTML, CSS y JavaScript. Primera demo de una plataforma para conectar perfiles de estudiantes con oportunidades laborales.

## Qué incluye

- Página adaptable a celular y escritorio.
- Formulario común: carrera, año, intereses, habilidades, experiencia, disponibilidad, horas y modalidad.
- Tres ofertas ficticias, filtro por modalidad y guardadas durante la visita.
- Navegación por teclado, etiquetas de formulario y mensajes accesibles.

**Es una demo:** el formulario no envía datos y las ofertas son ficticias. La aplicación verifica la conexión con Supabase, pero todavía no tiene autenticación, persistencia ni matching con IA. No se publica el catálogo real.

## Ver en tu computadora

Abrí `public/index.html` en el navegador. No requiere instalación ni compilación. Las tipografías se cargan desde Google Fonts; si no hay conexión se usan las fuentes del sistema.

## Publicar en Vercel

1. Importá este repositorio desde tu cuenta de Vercel.
2. Usá la raíz del repositorio como **Root Directory**.
3. En **Environment Variables**, agregá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores de tu proyecto. Aplicalas a Production, Preview y Development.
4. Publicá. Vercel detecta Next.js automáticamente.

Referencia: https://vercel.com/docs/builds/configure-a-build

## Próximo paso: Supabase

La arquitectura prevista para el MVP completo es Next.js + TypeScript, Supabase Auth y un backend de recomendaciones. La ruta `/api/supabase-status` verifica que las variables públicas puedan comunicarse con Supabase, sin consultar tablas ni exponer información del catálogo.

- Implementar registro e inicio de sesión con Supabase Auth.
- Guardar el perfil con políticas RLS para que cada estudiante acceda solo a sus datos.
- Consultar las recomendaciones desde un backend que valide la sesión. El navegador no debe consultar directamente `ofertas_laborales` ni recibir el catálogo completo.
- Mantener claves secretas y `service_role` exclusivamente en variables privadas del servidor; nunca en HTML, JavaScript público ni GitHub.
- Elegir el proveedor de IA y validar criterios del matching antes de mostrar puntuaciones reales.

## Archivos

`public/index.html`: estructura y formulario. `public/styles.css`: diseño. `public/app.js`: interacciones de demo. `vercel.json`: publicación estática.
