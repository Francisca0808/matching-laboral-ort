begin;

alter table public.documentos_estudiante
  drop constraint if exists documentos_pdf_check;

alter table public.documentos_estudiante
  add constraint documentos_formato_cv_check
  check (
    mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ) not valid,
  add column analisis_estado text not null default 'pendiente'
    check (analisis_estado in ('pendiente', 'procesando', 'completado', 'fallido')),
  add column analisis_resultado jsonb,
  add column analisis_modelo text,
  add column analisis_fecha timestamptz,
  add column analisis_error text,
  add constraint documentos_analisis_resultado_objeto_check
    check (analisis_resultado is null or jsonb_typeof(analisis_resultado) = 'object');

alter table public.documentos_estudiante
  validate constraint documentos_formato_cv_check;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]::text[]
where id = 'cvs';

insert into public.skills (codigo, nombre, verificada)
values ('google-analytics-4', 'Google Analytics 4', true)
on conflict (codigo) do update
set nombre = excluded.nombre,
    verificada = true;

insert into public.skill_aliases (skill_id, alias_normalizado)
select s.id, a.alias
from public.skills s
cross join (
  values ('google analytics 4'), ('google analytics'), ('ga4')
) a(alias)
where s.codigo = 'google-analytics-4'
on conflict (alias_normalizado) do nothing;

create or replace function private.sincronizar_relaciones_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.areas_interes (codigo, nombre)
  select private.normalizar_clave(x), min(btrim(x))
  from unnest(coalesce(new.areas_interes, '{}'::text[])) x
  where private.normalizar_clave(x) <> ''
  group by private.normalizar_clave(x)
  on conflict (codigo) do nothing;

  delete from public.perfil_areas_interes where perfil_id = new.id;
  insert into public.perfil_areas_interes (perfil_id, area_id)
  select distinct new.id, a.id
  from unnest(coalesce(new.areas_interes, '{}'::text[])) x
  join public.areas_interes a on a.codigo = private.normalizar_clave(x);

  delete from public.perfil_skills where perfil_id = new.id;
  insert into public.perfil_skills (perfil_id, skill_id)
  select distinct new.id, sa.skill_id
  from unnest(coalesce(new.skills, '{}'::text[])) x
  join public.skill_aliases sa
    on sa.alias_normalizado = private.normalizar_busqueda(x);

  delete from public.perfil_idiomas where perfil_id = new.id;
  insert into public.perfil_idiomas (perfil_id, idioma_id)
  select distinct new.id, ia.idioma_id
  from unnest(coalesce(new.idiomas, '{}'::text[])) x
  join public.idioma_aliases ia
    on ia.alias_normalizado = private.normalizar_busqueda(x);

  return null;
end;
$$;

comment on column public.documentos_estudiante.analisis_resultado is
  'Sugerencias estructuradas derivadas del CV. No contiene el texto completo extraído.';
comment on column public.documentos_estudiante.analisis_error is
  'Código técnico acotado. No almacena contenido del CV ni respuestas completas del proveedor.';

commit;
