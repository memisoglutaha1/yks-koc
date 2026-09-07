-- YKS Koçu — Supabase şeması
-- SQL Editor'de bir kez çalıştırın.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  role text not null check (role in ('teacher', 'student')),
  password_hash text not null,
  password_plain text,
  teacher_id uuid references public.accounts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists accounts_teacher_id_idx on public.accounts(teacher_id);
create index if not exists accounts_username_idx on public.accounts(username);

create table if not exists public.sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.accounts(id) on delete cascade,
  viewing_student_id uuid references public.accounts(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);

create table if not exists public.student_data (
  user_id uuid primary key references public.accounts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.sessions enable row level security;
alter table public.student_data enable row level security;

-- Tüm erişim SECURITY DEFINER RPC üzerinden; tabloyu doğrudan kapat.
revoke all on public.accounts from anon, authenticated;
revoke all on public.sessions from anon, authenticated;
revoke all on public.student_data from anon, authenticated;
grant usage on schema public to anon, authenticated;

create or replace function public._account_public(a public.accounts)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', a.id,
    'username', a.username,
    'displayName', a.display_name,
    'role', a.role,
    'teacherId', a.teacher_id,
    'passwordPlain', case when a.role = 'student' then a.password_plain else null end,
    'createdAt', a.created_at,
    'active', a.active
  );
$$;

create or replace function public._require_session(p_token uuid)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.accounts;
begin
  select a.* into acct
  from public.sessions s
  join public.accounts a on a.id = s.user_id
  where s.token = p_token
    and s.expires_at > now()
    and a.active = true;

  if acct.id is null then
    raise exception 'Oturum geçersiz veya süresi dolmuş';
  end if;

  return acct;
end;
$$;

create or replace function public.register_teacher(
  p_display_name text,
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
    crypt(p_password, gen_salt('bf')),
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
set search_path = public
as $$
declare
  uname text := lower(trim(p_username));
  acct public.accounts;
  tok uuid;
begin
  select * into acct
  from public.accounts
  where username = uname and active = true;

  if acct.id is null or acct.password_hash <> crypt(p_password, acct.password_hash) then
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

create or replace function public.logout(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sessions where token = p_token;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_session(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.accounts;
  viewing public.accounts;
  sid uuid;
begin
  select a.*, s.viewing_student_id into acct
  from public.sessions s
  join public.accounts a on a.id = s.user_id
  where s.token = p_token and s.expires_at > now() and a.active = true;

  if acct.id is null then
    return jsonb_build_object('ok', false, 'error', 'Oturum yok');
  end if;

  select viewing_student_id into sid from public.sessions where token = p_token;

  if sid is not null then
    select * into viewing from public.accounts where id = sid and active = true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'user', public._account_public(acct),
    'viewingStudent', case when viewing.id is null then null else public._account_public(viewing) end
  );
end;
$$;

-- get_session'daki select into hatasını düzelt: viewing_student_id ayrı alınmalı
create or replace function public.get_session(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.accounts;
  viewing public.accounts;
  sid uuid;
begin
  select s.viewing_student_id into sid
  from public.sessions s
  where s.token = p_token and s.expires_at > now();

  if sid is null and not exists (
    select 1 from public.sessions s where s.token = p_token and s.expires_at > now()
  ) then
    return jsonb_build_object('ok', false, 'error', 'Oturum yok');
  end if;

  select a.* into acct
  from public.sessions s
  join public.accounts a on a.id = s.user_id
  where s.token = p_token and s.expires_at > now() and a.active = true;

  if acct.id is null then
    return jsonb_build_object('ok', false, 'error', 'Oturum yok');
  end if;

  if sid is not null then
    select * into viewing
    from public.accounts
    where id = sid and active = true and role = 'student' and teacher_id = acct.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'user', public._account_public(acct),
    'viewingStudent', case when viewing.id is null then null else public._account_public(viewing) end
  );
end;
$$;

create or replace function public.set_viewing_student(p_token uuid, p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher public.accounts;
begin
  teacher := public._require_session(p_token);
  if teacher.role <> 'teacher' then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;

  if p_student_id is not null then
    if not exists (
      select 1 from public.accounts
      where id = p_student_id and role = 'student' and teacher_id = teacher.id and active = true
    ) then
      return jsonb_build_object('ok', false, 'error', 'Öğrenci bulunamadı.');
    end if;
  end if;

  update public.sessions
  set viewing_student_id = p_student_id
  where token = p_token;

  return jsonb_build_object('ok', true);
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
set search_path = public
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
    crypt(p_password, gen_salt('bf')),
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

create or replace function public.list_students(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher public.accounts;
  result jsonb;
begin
  teacher := public._require_session(p_token);
  if teacher.role <> 'teacher' then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;

  select coalesce(jsonb_agg(public._account_public(a) order by a.display_name), '[]'::jsonb)
  into result
  from public.accounts a
  where a.role = 'student' and a.teacher_id = teacher.id and a.active = true;

  return jsonb_build_object('ok', true, 'students', result);
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
set search_path = public
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
  set password_hash = crypt(p_new_password, gen_salt('bf')),
      password_plain = p_new_password
  where id = p_student_id and role = 'student' and teacher_id = teacher.id and active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Öğrenci bulunamadı.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.deactivate_student(p_token uuid, p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher public.accounts;
begin
  teacher := public._require_session(p_token);
  if teacher.role <> 'teacher' then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;

  update public.accounts
  set active = false
  where id = p_student_id and role = 'student' and teacher_id = teacher.id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Öğrenci bulunamadı.');
  end if;

  update public.sessions set viewing_student_id = null
  where token = p_token and viewing_student_id = p_student_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_student_data(p_token uuid, p_student_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.accounts;
  target_id uuid;
  payload jsonb;
begin
  actor := public._require_session(p_token);

  if actor.role = 'student' then
    target_id := actor.id;
  elsif actor.role = 'teacher' then
    if p_student_id is null then
      return jsonb_build_object('ok', false, 'error', 'Öğrenci seçilmedi.');
    end if;
    if not exists (
      select 1 from public.accounts
      where id = p_student_id and role = 'student' and teacher_id = actor.id and active = true
    ) then
      return jsonb_build_object('ok', false, 'error', 'Öğrenci bulunamadı.');
    end if;
    target_id := p_student_id;
  else
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;

  select data into payload from public.student_data where user_id = target_id;
  if payload is null then
    payload := '{}'::jsonb;
  end if;

  return jsonb_build_object('ok', true, 'userId', target_id, 'data', payload);
end;
$$;

create or replace function public.save_student_data(
  p_token uuid,
  p_data jsonb,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.accounts;
  target_id uuid;
begin
  actor := public._require_session(p_token);

  if actor.role = 'student' then
    target_id := actor.id;
  elsif actor.role = 'teacher' then
    if p_student_id is null then
      return jsonb_build_object('ok', false, 'error', 'Öğrenci seçilmedi.');
    end if;
    if not exists (
      select 1 from public.accounts
      where id = p_student_id and role = 'student' and teacher_id = actor.id and active = true
    ) then
      return jsonb_build_object('ok', false, 'error', 'Öğrenci bulunamadı.');
    end if;
    target_id := p_student_id;
  else
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;

  insert into public.student_data (user_id, data, updated_at)
  values (target_id, p_data, now())
  on conflict (user_id) do update
    set data = excluded.data,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_student_overview(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher public.accounts;
  result jsonb;
begin
  teacher := public._require_session(p_token);
  if teacher.role <> 'teacher' then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz.');
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into result
  from (
    select
      public._account_public(a) as user,
      coalesce(jsonb_array_length(sd.data->'testResults'), 0) as "testCount",
      coalesce(jsonb_array_length(sd.data->'mockExams'), 0) as "mockCount",
      (
        select count(*)::int
        from jsonb_array_elements(coalesce(sd.data->'dailyTasks', '[]'::jsonb)) t
        where t->>'date' = to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM-DD')
          and (t->>'completed')::boolean = true
      ) as "todayCompleted",
      (
        select count(*)::int
        from jsonb_array_elements(coalesce(sd.data->'dailyTasks', '[]'::jsonb)) t
        where t->>'date' = to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM-DD')
      ) as "todayTotal",
      greatest(
        (
          select max(t->>'date')
          from jsonb_array_elements(coalesce(sd.data->'testResults', '[]'::jsonb)) t
        ),
        (
          select max(t->>'date')
          from jsonb_array_elements(coalesce(sd.data->'mockExams', '[]'::jsonb)) t
        )
      ) as "lastActivity"
    from public.accounts a
    left join public.student_data sd on sd.user_id = a.id
    where a.role = 'student' and a.teacher_id = teacher.id and a.active = true
    order by a.display_name
  ) x;

  return jsonb_build_object('ok', true, 'overviews', result);
end;
$$;

grant execute on function public.register_teacher(text, text, text) to anon, authenticated;
grant execute on function public.login(text, text) to anon, authenticated;
grant execute on function public.logout(uuid) to anon, authenticated;
grant execute on function public.get_session(uuid) to anon, authenticated;
grant execute on function public.set_viewing_student(uuid, uuid) to anon, authenticated;
grant execute on function public.create_student(uuid, text, text, text) to anon, authenticated;
grant execute on function public.list_students(uuid) to anon, authenticated;
grant execute on function public.reset_student_password(uuid, uuid, text) to anon, authenticated;
grant execute on function public.deactivate_student(uuid, uuid) to anon, authenticated;
grant execute on function public.get_student_data(uuid, uuid) to anon, authenticated;
grant execute on function public.save_student_data(uuid, jsonb, uuid) to anon, authenticated;
grant execute on function public.get_student_overview(uuid) to anon, authenticated;
