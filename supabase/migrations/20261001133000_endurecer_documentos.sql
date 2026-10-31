begin;

alter table public.documentos_estudiante
  add constraint documentos_bucket_cvs_check check (bucket_id = 'cvs') not valid,
  add constraint documentos_pdf_check check (mime_type = 'application/pdf') not valid;

alter table public.documentos_estudiante validate constraint documentos_bucket_cvs_check;
alter table public.documentos_estudiante validate constraint documentos_pdf_check;

drop policy documento_propio on public.documentos_estudiante;

create policy documento_propio
on public.documentos_estudiante
for all to authenticated
using (
  bucket_id = 'cvs'
  and split_part(object_path, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.perfiles_estudiantes p
    where p.id = perfil_id and p.user_id = (select auth.uid())
  )
  and not (select private.es_admin())
)
with check (
  bucket_id = 'cvs'
  and split_part(object_path, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.perfiles_estudiantes p
    where p.id = perfil_id and p.user_id = (select auth.uid())
  )
  and not (select private.es_admin())
);

commit;
