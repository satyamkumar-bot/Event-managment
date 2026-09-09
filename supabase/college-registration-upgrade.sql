-- Run this AFTER schema.sql and college-access-migration.sql.
-- It adds self-service college registration and an invite/member code for every account.

alter table public.profiles add column if not exists access_code text;
create unique index if not exists profiles_access_code_key on public.profiles(access_code) where access_code is not null;

-- Assign codes to existing accounts once.
update public.profiles
set access_code = 'USR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where access_code is null;
alter table public.profiles alter column access_code set default ('USR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
alter table public.profiles alter column access_code set not null;

-- Replace the basic sign-up trigger. A college/organization owner becomes college_admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_college_id uuid;
  supplied_college text := trim(coalesce(new.raw_user_meta_data ->> 'college_name', ''));
  is_college_registration boolean := coalesce(new.raw_user_meta_data ->> 'account_type', 'student') = 'college';
begin
  insert into public.profiles (id, full_name, email, roll_number, college_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'roll_number', ''),
    supplied_college,
    case when is_college_registration then 'college_admin' else 'participant' end
  );

  if is_college_registration and supplied_college <> '' then
    insert into public.colleges(name, created_by) values (supplied_college, new.id)
    returning id into new_college_id;
    update public.profiles set college_id = new_college_id where id = new.id;
  elsif supplied_college <> '' then
    select id into new_college_id from public.colleges where lower(name) = lower(supplied_college) limit 1;
    update public.profiles set college_id = new_college_id where id = new.id;
  end if;
  return new;
end;
$$;
