-- Tek seferlik düzeltme: pgcrypto + fonksiyon search_path
-- Supabase SQL Editor'de Run edin (veya güncel schema.sql'i baştan çalıştırın)

create extension if not exists pgcrypto with schema extensions;

do $$
declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'register_teacher','login','logout','get_session','set_viewing_student',
        'create_student','list_students','reset_student_password','deactivate_student',
        'get_student_data','save_student_data','get_student_overview','_require_session'
      )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, extensions',
      r.nspname, r.proname, r.args
    );
  end loop;
end $$;
