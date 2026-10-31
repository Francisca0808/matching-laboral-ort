begin;

create index carreras_facultad_idx on public.carreras(facultad_id);
create index perfiles_carrera_idx on public.perfiles_estudiantes(carrera_id);
create index perfil_areas_area_idx on public.perfil_areas_interes(area_id);
create index perfil_skills_skill_idx on public.perfil_skills(skill_id);
create index perfil_idiomas_idioma_idx on public.perfil_idiomas(idioma_id);
create index oferta_facultades_facultad_idx on public.oferta_facultades(facultad_id);
create index oferta_areas_area_idx on public.oferta_areas_interes(area_id);
create index oferta_skills_skill_idx on public.oferta_skills(skill_id);
create index oferta_idiomas_idioma_idx on public.oferta_idiomas(idioma_id);
create index oferta_carreras_carrera_idx on public.oferta_carreras(carrera_id);
create index ofertas_organizacion_idx on public.ofertas_laborales(organizacion_id);
create index ofertas_tipo_contrato_idx on public.ofertas_laborales(tipo_contrato_id);
create index ofertas_tipo_cargo_idx on public.ofertas_laborales(tipo_cargo_id);
create index ofertas_creada_por_idx on public.ofertas_laborales(creada_por);
create index ofertas_actualizada_por_idx on public.ofertas_laborales(actualizada_por);

drop policy estudiante_ve_su_perfil on public.perfiles_estudiantes;
drop policy estudiante_crea_su_perfil on public.perfiles_estudiantes;
drop policy estudiante_actualiza_su_perfil on public.perfiles_estudiantes;
drop policy estudiante_elimina_su_perfil on public.perfiles_estudiantes;

create policy estudiante_ve_su_perfil
on public.perfiles_estudiantes for select to authenticated
using ((select auth.uid()) = user_id);

create policy estudiante_crea_su_perfil
on public.perfiles_estudiantes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy estudiante_actualiza_su_perfil
on public.perfiles_estudiantes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy estudiante_elimina_su_perfil
on public.perfiles_estudiantes for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy administrador_gestiona_ofertas on public.ofertas_laborales;
drop policy estudiante_lee_ofertas_activas on public.ofertas_laborales;

create policy ofertas_lectura_autenticada
on public.ofertas_laborales for select to authenticated
using (
  (select private.es_admin())
  or (
    estado = 'activa'
    and (select auth.uid()) is not null
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false'
  )
);

create policy ofertas_admin_inserta
on public.ofertas_laborales for insert to authenticated
with check ((select private.es_admin()));

create policy ofertas_admin_actualiza
on public.ofertas_laborales for update to authenticated
using ((select private.es_admin()))
with check ((select private.es_admin()));

create policy ofertas_admin_elimina
on public.ofertas_laborales for delete to authenticated
using ((select private.es_admin()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'facultades','carreras','areas_interes','skills','skill_aliases','idiomas',
    'idioma_aliases','tipos_contrato','tipos_cargo','organizaciones'
  ] loop
    execute format('drop policy catalogo_gestion_admin on public.%I', t);
    execute format(
      'create policy catalogo_admin_inserta on public.%I for insert to authenticated with check ((select private.es_admin()))', t
    );
    execute format(
      'create policy catalogo_admin_actualiza on public.%I for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()))', t
    );
    execute format(
      'create policy catalogo_admin_elimina on public.%I for delete to authenticated using ((select private.es_admin()))', t
    );
  end loop;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'oferta_facultades','oferta_areas_interes','oferta_skills','oferta_idiomas',
    'oferta_carreras','canales_postulacion'
  ] loop
    execute format('drop policy oferta_relacion_lectura on public.%I', t);
    execute format('drop policy oferta_relacion_admin on public.%I', t);
    execute format(
      'create policy oferta_relacion_lectura on public.%I for select to authenticated using ((select private.es_admin()) or exists (select 1 from public.ofertas_laborales o where o.id = oferta_id and o.estado = ''activa''))', t
    );
    execute format(
      'create policy oferta_relacion_admin_inserta on public.%I for insert to authenticated with check ((select private.es_admin()))', t
    );
    execute format(
      'create policy oferta_relacion_admin_actualiza on public.%I for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()))', t
    );
    execute format(
      'create policy oferta_relacion_admin_elimina on public.%I for delete to authenticated using ((select private.es_admin()))', t
    );
  end loop;
end;
$$;

commit;
