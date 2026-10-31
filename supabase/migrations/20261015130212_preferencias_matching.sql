begin;

create table public.preferencias_matching (
  perfil_id uuid primary key references public.perfiles_estudiantes(id) on delete cascade,
  peso_skills numeric(5,2) not null default 30 check (peso_skills between 0 and 100),
  peso_areas numeric(5,2) not null default 25 check (peso_areas between 0 and 100),
  peso_carrera numeric(5,2) not null default 15 check (peso_carrera between 0 and 100),
  peso_modalidad numeric(5,2) not null default 10 check (peso_modalidad between 0 and 100),
  peso_jornada numeric(5,2) not null default 10 check (peso_jornada between 0 and 100),
  peso_horario numeric(5,2) not null default 10 check (peso_horario between 0 and 100),
  peso_salario numeric(5,2) not null default 0 check (peso_salario between 0 and 100),
  salario_minimo_deseado numeric(14,2) check (salario_minimo_deseado is null or salario_minimo_deseado >= 0),
  moneda_preferida text check (moneda_preferida is null or moneda_preferida ~ '^[A-Z]{3}$'),
  periodicidad_preferida text check (periodicidad_preferida is null or periodicidad_preferida in ('hora', 'mes', 'anio')),
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint preferencias_matching_suma_cien check (
    peso_skills + peso_areas + peso_carrera + peso_modalidad +
    peso_jornada + peso_horario + peso_salario = 100
  )
);

alter table public.preferencias_matching enable row level security;
revoke all on public.preferencias_matching from public, anon, authenticated;
grant select, insert, update, delete on public.preferencias_matching to authenticated;

create policy preferencias_matching_lectura_propia
on public.preferencias_matching for select to authenticated
using (
  exists (
    select 1 from public.perfiles_estudiantes p
    where p.id = perfil_id and p.user_id = (select auth.uid())
  ) and not (select private.es_admin())
);

create policy preferencias_matching_inserta_propia
on public.preferencias_matching for insert to authenticated
with check (
  exists (
    select 1 from public.perfiles_estudiantes p
    where p.id = perfil_id and p.user_id = (select auth.uid())
  ) and not (select private.es_admin())
);

create policy preferencias_matching_actualiza_propia
on public.preferencias_matching for update to authenticated
using (
  exists (
    select 1 from public.perfiles_estudiantes p
    where p.id = perfil_id and p.user_id = (select auth.uid())
  ) and not (select private.es_admin())
)
with check (
  exists (
    select 1 from public.perfiles_estudiantes p
    where p.id = perfil_id and p.user_id = (select auth.uid())
  ) and not (select private.es_admin())
);

create policy preferencias_matching_elimina_propia
on public.preferencias_matching for delete to authenticated
using (
  exists (
    select 1 from public.perfiles_estudiantes p
    where p.id = perfil_id and p.user_id = (select auth.uid())
  ) and not (select private.es_admin())
);

comment on table public.preferencias_matching is
  'Configuración uno a uno de pesos del matching elegida por cada estudiante.';
comment on column public.preferencias_matching.peso_salario is
  'Preparado para ofertas con salario estructurado; permanece en cero mientras no haya datos comparables.';

commit;
