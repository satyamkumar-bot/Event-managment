-- Run this file once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text, phone text, roll_number text,
  college_name text, role text not null default 'participant'
    check (role in ('participant','organizer','judge','volunteer','core_team','super_admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing; return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), parent_event_id uuid references public.events(id) on delete cascade,
  title text not null, description text, event_type text not null default 'sub_event' check(event_type in ('main_event','sub_event')),
  category text, organizer_id uuid not null references public.profiles(id) on delete restrict, venue text,
  start_time timestamptz not null, end_time timestamptz not null, rules text, eligibility text,
  registration_fee numeric(10,2) not null default 0, max_participants integer check(max_participants is null or max_participants > 0),
  registration_deadline timestamptz, registration_mode text not null default 'sub_event_required',
  registration_requires_approval boolean not null default false, allow_main_pass_entry boolean not null default false,
  status text not null default 'pending' check(status in ('pending','approved','changes_requested','rejected','published','ongoing','completed','cancelled','archived')),
  poster_url text, chat_enabled boolean not null default true, created_at timestamptz not null default now(),
  check(end_time > start_time)
);
create table if not exists public.event_registration_fields (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  field_key text not null, label text not null, field_type text not null check(field_type in ('text','textarea','number','email','phone','url','date','select','radio','checkbox','multi_select')),
  placeholder text, options jsonb not null default '[]'::jsonb, is_required boolean not null default false, display_order integer not null default 0,
  unique(event_id, field_key)
);
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade, registration_type text not null default 'participant',
  approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected','waitlisted','cancelled')),
  status text not null default 'pending', qr_token uuid not null unique default gen_random_uuid(), qr_pass_type text not null default 'sub_event_pass',
  checked_in boolean not null default false, checked_in_at timestamptz, registered_at timestamptz not null default now(), unique(event_id, participant_id, registration_type)
);
create table if not exists public.registration_answers (
  id uuid primary key default gen_random_uuid(), registration_id uuid not null references public.registrations(id) on delete cascade,
  field_id uuid not null references public.event_registration_fields(id) on delete cascade, answer_text text, answer_json jsonb, unique(registration_id,field_id)
);
create table if not exists public.event_discussions (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, message text not null check(char_length(message) between 1 and 2000), created_at timestamptz not null default now()
);

create or replace function public.prevent_late_registration() returns trigger language plpgsql as $$
declare deadline timestamptz; capacity integer; registered integer;
begin
 select registration_deadline,max_participants into deadline,capacity from public.events where id=new.event_id;
 if deadline is not null and now()>deadline then raise exception 'Registration deadline has passed.'; end if;
 if capacity is not null then select count(*) into registered from public.registrations where event_id=new.event_id and approval_status in ('pending','approved','waitlisted'); if registered>=capacity then raise exception 'This event is already full.'; end if; end if;
 return new;
end; $$;
drop trigger if exists check_registration_deadline on public.registrations;
create trigger check_registration_deadline before insert on public.registrations for each row execute procedure public.prevent_late_registration();

alter table public.profiles enable row level security; alter table public.events enable row level security; alter table public.event_registration_fields enable row level security; alter table public.registrations enable row level security; alter table public.registration_answers enable row level security; alter table public.event_discussions enable row level security;
create or replace function public.user_role() returns text language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.can_manage_event(eid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.events where id=eid and organizer_id=auth.uid()) or coalesce(public.user_role() in ('core_team','super_admin'),false) $$;
create policy "profiles readable" on public.profiles for select to authenticated using(true);
create policy "profiles self update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "events readable" on public.events for select using(status in ('published','ongoing','completed','archived') or organizer_id=auth.uid() or public.user_role() in ('core_team','super_admin'));
create policy "events create" on public.events for insert to authenticated with check(organizer_id=auth.uid() and public.user_role() in ('organizer','core_team','super_admin'));
create policy "events update" on public.events for update to authenticated using(organizer_id=auth.uid() or public.user_role() in ('core_team','super_admin'));
create policy "fields readable" on public.event_registration_fields for select to authenticated using(true);
create policy "fields managed" on public.event_registration_fields for all to authenticated using(public.can_manage_event(event_id)) with check(public.can_manage_event(event_id));
create policy "registrations readable" on public.registrations for select to authenticated using(participant_id=auth.uid() or public.can_manage_event(event_id));
create policy "registrations create" on public.registrations for insert to authenticated with check(participant_id=auth.uid());
create policy "registrations manage" on public.registrations for update to authenticated using(public.can_manage_event(event_id));
create policy "answers readable" on public.registration_answers for select to authenticated using(exists(select 1 from public.registrations r where r.id=registration_id and (r.participant_id=auth.uid() or public.can_manage_event(r.event_id))));
create policy "answers create" on public.registration_answers for insert to authenticated with check(exists(select 1 from public.registrations r where r.id=registration_id and r.participant_id=auth.uid()));
create policy "discussion readable" on public.event_discussions for select to authenticated using(true);
create policy "discussion create" on public.event_discussions for insert to authenticated with check(user_id=auth.uid());
