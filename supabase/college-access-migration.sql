-- Run AFTER schema.sql. This changes the starter into a college-based platform.

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists college_id uuid references public.colleges(id) on delete set null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('participant','college_admin','organizer','judge','volunteer','core_team','super_admin'));
alter table public.events add column if not exists college_id uuid references public.colleges(id) on delete restrict;

create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  staff_role text not null check (staff_role in ('core_team','organizer')),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(event_id,user_id)
);

alter table public.colleges enable row level security;
alter table public.event_staff enable row level security;

create or replace function public.is_college_admin(target_college uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and college_id=target_college and role in ('college_admin','super_admin'))
$$;
create or replace function public.has_event_staff_role(target_event uuid, allowed_roles text[]) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.event_staff where event_id=target_event and user_id=auth.uid() and staff_role=any(allowed_roles))
$$;
create or replace function public.can_manage_event_v2(target_event uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.events e where e.id=target_event and (public.is_college_admin(e.college_id) or public.has_event_staff_role(e.id,array['core_team','organizer']) or e.organizer_id=auth.uid()))
$$;
create or replace function public.can_create_event_v2(target_college uuid, parent uuid) returns boolean language sql stable security definer set search_path=public as $$
  select case when parent is null then public.is_college_admin(target_college)
  else exists(select 1 from public.events e where e.id=parent and e.college_id=target_college and (public.is_college_admin(target_college) or public.has_event_staff_role(parent,array['core_team','organizer']))) end
$$;

drop policy if exists "events readable" on public.events;
drop policy if exists "events create" on public.events;
drop policy if exists "events update" on public.events;
create policy "college events readable" on public.events for select to authenticated using (
  (status in ('published','ongoing','completed','archived') and exists(select 1 from public.profiles p where p.id=auth.uid() and p.college_id=events.college_id))
  or public.can_manage_event_v2(id)
);
create policy "college admins and staff create events" on public.events for insert to authenticated with check (
  organizer_id=auth.uid() and public.can_create_event_v2(college_id,parent_event_id)
);
create policy "college admins and staff update events" on public.events for update to authenticated using(public.can_manage_event_v2(id)) with check(public.can_manage_event_v2(id));

create policy "college profiles readable" on public.colleges for select to authenticated using(true);
create policy "college admin creates college" on public.colleges for insert to authenticated with check(created_by=auth.uid());
create policy "staff visible to college members" on public.event_staff for select to authenticated using(exists(select 1 from public.events e join public.profiles p on p.id=auth.uid() where e.id=event_id and e.college_id=p.college_id));
create policy "admins and core teams assign staff" on public.event_staff for insert to authenticated with check(public.is_college_admin((select college_id from public.events where id=event_id)) or public.has_event_staff_role(event_id,array['core_team']));
create policy "admins and core teams remove staff" on public.event_staff for delete to authenticated using(public.is_college_admin((select college_id from public.events where id=event_id)) or public.has_event_staff_role(event_id,array['core_team']));

-- One-time setup for an existing account. Replace the email and college name.
-- insert into public.colleges(name,created_by) select 'Your College',id from public.profiles where email='you@example.com';
-- update public.profiles set college_id=(select id from public.colleges where name='Your College'), role='college_admin' where email='you@example.com';
