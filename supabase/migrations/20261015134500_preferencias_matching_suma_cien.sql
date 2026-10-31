alter table public.preferencias_matching
  drop constraint preferencias_matching_suma_positiva,
  add constraint preferencias_matching_suma_cien check (
    peso_skills + peso_areas + peso_carrera + peso_modalidad +
    peso_jornada + peso_horario + peso_salario = 100
  );
