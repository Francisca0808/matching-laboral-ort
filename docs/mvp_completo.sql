begin;
alter table public.perfiles_estudiantes add column if not exists skills text[] not null default '{}', add column if not exists idiomas text[] not null default '{}', add column if not exists experiencia_resumen text not null default '';
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table if not exists private.administradores (user_id uuid primary key references auth.users(id) on delete cascade);
alter table private.administradores enable row level security;
revoke all on private.administradores from public, anon, authenticated;
create or replace function private.es_admin() returns boolean language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists(select 1 from private.administradores where user_id = auth.uid()) $$;
revoke all on function private.es_admin() from public, anon;
grant execute on function private.es_admin() to authenticated;
create or replace function public.rol_actual() returns text language sql stable security invoker set search_path = ''
as $$ select case when private.es_admin() then 'admin' else 'estudiante' end $$;
revoke all on function public.rol_actual() from public, anon;
grant execute on function public.rol_actual() to authenticated;
grant select, insert, update, delete on public.ofertas_laborales to authenticated;
grant usage, select on sequence public.ofertas_laborales_id_seq to authenticated;
create policy administrador_gestiona_ofertas on public.ofertas_laborales for all to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create table public.interacciones_ofertas (
 user_id uuid not null references auth.users(id) on delete cascade,
 oferta_id bigint not null references public.ofertas_laborales(id) on delete cascade,
 estado text not null check (estado in ('guardada','descartada')),
 fecha_actualizacion timestamptz not null default now(),
 primary key (user_id, oferta_id)
);
create index interacciones_oferta_idx on public.interacciones_ofertas(oferta_id);
alter table public.interacciones_ofertas enable row level security;
revoke all on public.interacciones_ofertas from public, anon, authenticated;
grant select, insert, update, delete on public.interacciones_ofertas to authenticated;
create policy interacciones_propias on public.interacciones_ofertas for all to authenticated using ((select auth.uid())=user_id and not (select private.es_admin())) with check ((select auth.uid())=user_id and not (select private.es_admin()));
create policy solo_estudiante_perfiles on public.perfiles_estudiantes as restrictive for all to authenticated using (not (select private.es_admin())) with check (not (select private.es_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('cvs','cvs',false,5242880,array['application/pdf']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['application/pdf'];
create policy cv_propio_select on storage.objects for select to authenticated using (bucket_id='cvs' and (storage.foldername(name))[1]=(select auth.uid())::text and not (select private.es_admin()));
create policy cv_propio_insert on storage.objects for insert to authenticated with check (bucket_id='cvs' and (storage.foldername(name))[1]=(select auth.uid())::text and not (select private.es_admin()));
create policy cv_propio_update on storage.objects for update to authenticated using (bucket_id='cvs' and (storage.foldername(name))[1]=(select auth.uid())::text and not (select private.es_admin())) with check (bucket_id='cvs' and (storage.foldername(name))[1]=(select auth.uid())::text and not (select private.es_admin()));
create policy cv_propio_delete on storage.objects for delete to authenticated using (bucket_id='cvs' and (storage.foldername(name))[1]=(select auth.uid())::text and not (select private.es_admin()));
commit;

-- Aplicado en la migración posterior explicitar_bloqueo_tabla_roles.
create policy administradores_sin_acceso_directo on private.administradores
for all to authenticated using (false) with check (false);
