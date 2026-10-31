alter table public.ofertas_laborales alter column estado set default 'activa';
update public.ofertas_laborales set estado = 'activa' where estado = '''activa''';
revoke all on public.ofertas_laborales from anon, authenticated;
grant select on public.ofertas_laborales to authenticated;
create policy estudiante_lee_ofertas_activas on public.ofertas_laborales for select to authenticated using (estado = 'activa' and (select auth.uid()) is not null and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false');
revoke all on public.perfiles_estudiantes from anon, authenticated;
grant select, insert, update, delete on public.perfiles_estudiantes to authenticated;
