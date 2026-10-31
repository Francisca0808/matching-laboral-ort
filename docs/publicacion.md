# Publicación

Proyecto existente: `panchicosta-1052/matching-laboral-ort`. No crear otro.

URL: https://matching-laboral-ort.vercel.app

## Volver a desplegar desde esta carpeta

La carpeta local ya está vinculada y la sesión de Vercel quedó iniciada. Ejecutar:

```sh
npx --yes vercel@60.1.3 deploy --prod --yes
```

En otra computadora, primero:

```sh
npx --yes vercel@60.1.3 login
npx --yes vercel@60.1.3 link --yes --scope panchicosta-1052 --project matching-laboral-ort
npx --yes vercel@60.1.3 deploy --prod --yes
```

La compilación remota ejecuta lint y pruebas. Variables públicas: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nunca usar una clave `service_role` o secreta en variables `NEXT_PUBLIC_`.

## Administrador real

Crear y confirmar primero la cuenta que administrará ofertas. El propietario de Supabase debe asignarle el rol mediante SQL Editor. Reemplazar el correo por el de esa cuenta:

```sql
insert into private.administradores (user_id)
select id from auth.users
where email = 'CORREO_DEL_ADMINISTRADOR'
  and email_confirmed_at is not null
on conflict do nothing
returning user_id;
```

Debe devolver una fila la primera vez. Si no devuelve ninguna, comprobar que la cuenta exista, esté confirmada o ya tenga el rol. Cerrar sesión y entrar de nuevo. El administrador verá únicamente la gestión de ofertas. No hay un mecanismo público para autoasignarse este rol.

## Registro abierto: único servicio pendiente

SMTP personalizado está desactivado en Supabase. El correo predeterminado solo permite destinatarios que sean miembros del equipo del proyecto. Por eso no se declara validado el registro de estudiantes externos. La confirmación permanece activada.

1. Abrir https://supabase.com/dashboard/project/hvkhwxyxdounrdonynhp/auth/smtp.
2. Conectar el proveedor de correo del proyecto: remitente verificado, servidor, puerto, usuario y contraseña SMTP. Esos datos no están disponibles en este entorno.
3. Registrarse en la URL publicada con un correo real, abrir el enlace recibido e iniciar sesión.

El Site URL de Supabase ya quedó en `https://matching-laboral-ort.vercel.app`. No hace falta cambiar código ni volver a publicar para conectar SMTP.

Fuente: https://supabase.com/docs/guides/auth/auth-smtp

## Guardar el código final en GitHub

El conector no puede escribir y Git local no tiene credenciales. El camino más corto con la sesión web existente es:

1. Descomprimir `matching-laboral-ort-final.zip`.
2. Abrir https://github.com/Francisca0808/matching-laboral-ort/upload/main.
3. Arrastrar el contenido de la carpeta descomprimida a la raíz del repositorio, sin incluir la carpeta contenedora. Confirmar los cambios con el mensaje `Completar MVP de matching laboral ORT`.

El ZIP no contiene credenciales, `.env.local`, dependencias ni resultados compilados. Incluye `.env.example`. La versión ya está publicada por CLI; subir los archivos guarda la fuente y puede iniciar otra compilación automática.

Si preferís Git y ya tenés autenticación e identidad configuradas, usar el parche preparado:

```sh
git clone https://github.com/Francisca0808/matching-laboral-ort.git matching-laboral-ort-publicar
cd matching-laboral-ort-publicar
git apply --index /RUTA/AL/ARCHIVO/matching-laboral-ort-final.patch
git commit -m "Completar MVP de matching laboral ORT"
git push origin main
```

El parche se preparó contra `db1a426aa5bcb0acb35def7b9f2385c50e7cd247`. Si el repositorio cambió, `git apply` puede detenerse para evitar pisar cambios; no usar force. La contraseña normal de GitHub no sirve como contraseña de Git HTTPS: usar una sesión o credencial autorizada para el repositorio.
