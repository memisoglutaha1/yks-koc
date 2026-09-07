-- Şifre hatası düzeltmesi: extensions.crypt / extensions.gen_salt
-- Supabase SQL Editor → Run

create extension if not exists pgcrypto with schema extensions;

create or replace function public.register_teacher(
  p_display_name text,
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uname text := lower(trim(p_username));
  new_id uuid;
  tok uuid;
  acct public.accounts;
begin
  if length(uname) < 3 then
    return jsonb_build_object('ok', false, 'error', 'Kullanıcı adı en az 3 karakter olmalı.');
  end if;
  if length(p_password) < 4 then
    return jsonb_build_object('ok', false, 'error', 'Şifre en az 4 karakter olmalı.');
  end if;
  if exists (select 1 from public.accounts where username = uname) then
    return jsonb_build_object('ok', false, 'error', 'Bu kullanıcı adı alınmış.');
  end if;

  insert into public.accounts (username, display_name, role, password_hash, password_plain)
  values (
    uname,
    coalesce(nullif(trim(p_display_name), ''), 'Öğretmen'),
    'teacher',
    extensions.crypt(p_password, extensions.gen_salt('bf'::text)),
    null
  )
  returning id into new_id;

  insert into public.sessions (user_id) values (new_id) returning token into tok;
  select * into acct from public.accounts where id = new_id;

  return jsonb_build_object(
    'ok', true,
    'token', tok,
    'user', public._account_public(acct)
  );
end;
$$;

create or replace function public.login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uname text := lower(trim(p_username));
  acct public.accounts;
  tok uuid;
begin
  select * into acct
  from public.accounts
  where username = uname and active = true;

  if acct.id is null or acct.password_hash <> extensions.crypt(p_password, acct.password_hash) then
    return jsonb_build_object('ok', false, 'error', 'Kullanıcı adı veya şifre hatalı.');
  end if;

  insert into public.sessions (user_id) values (acct.id) returning token into tok;

  return jsonb_build_object(
    'ok', true,
    'token', tok,
    'user', public._account_public(acct)
  );
end;
$$;

create or replace function public.create_student(
  p_token uuid,
  p_display_name text,
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  teacher public.accounts;
  uname text := lower(trim(p_username));
  new_id uuid;
  acct public.accounts;
begin
  teacher := public._require_session(p_token);
  if teacher.role <> 'teacher' then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;
  if length(trim(p_display_name)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Öğrenci adı gerekli.');
  end if;
  if length(uname) < 3 then
    return jsonb_build_object('ok', false, 'error', 'Kullanıcı adı en az 3 karakter olmalı.');
  end if;
  if length(p_password) < 4 then
    return jsonb_build_object('ok', false, 'error', 'Şifre en az 4 karakter olmalı.');
  end if;
  if exists (select 1 from public.accounts where username = uname) then
    return jsonb_build_object('ok', false, 'error', 'Bu kullanıcı adı alınmış.');
  end if;

  insert into public.accounts (username, display_name, role, password_hash, password_plain, teacher_id)
  values (
    uname,
    trim(p_display_name),
    'student',
    extensions.crypt(p_password, extensions.gen_salt('bf'::text)),
    p_password,
    teacher.id
  )
  returning id into new_id;

  insert into public.student_data (user_id, data)
  values (
    new_id,
    jsonb_build_object(
      'settings', jsonb_build_object(
        'studentName', trim(p_display_name),
        'targetRank', 20000,
        'targetRankTyt', 50000,
        'targetRankAyt', 20000,
        'previousRank', 363000,
        'previousRankTyt', 363000,
        'previousRankAyt', 363000,
        'examYear', 2027
      ),
      'testResults', '[]'::jsonb,
      'dailyTasks', '[]'::jsonb,
      'mockExams', '[]'::jsonb,
      'topicProgress', '{}'::jsonb,
      'plannerSettings', null,
      'generatedPlan', null
    )
  );

  select * into acct from public.accounts where id = new_id;
  return jsonb_build_object('ok', true, 'user', public._account_public(acct));
end;
$$;

create or replace function public.reset_student_password(
  p_token uuid,
  p_student_id uuid,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  teacher public.accounts;
begin
  teacher := public._require_session(p_token);
  if teacher.role <> 'teacher' then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;
  if length(p_new_password) < 4 then
    return jsonb_build_object('ok', false, 'error', 'Şifre en az 4 karakter olmalı.');
  end if;

  update public.accounts
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'::text)),
      password_plain = p_new_password
  where id = p_student_id and role = 'student' and teacher_id = teacher.id and active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Öğrenci bulunamadı.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
