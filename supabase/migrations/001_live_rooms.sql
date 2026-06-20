create extension if not exists pgcrypto;

create table if not exists public.bill_splitter_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  state jsonb not null,
  revision bigint not null default 1,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_splitter_room_members (
  room_id uuid not null references public.bill_splitter_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.bill_splitter_rooms enable row level security;
alter table public.bill_splitter_room_members enable row level security;

create or replace function public.is_bill_splitter_room_member(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.bill_splitter_room_members
    where room_id = target_room_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_bill_splitter_room_member(uuid) from public;
grant execute on function public.is_bill_splitter_room_member(uuid) to authenticated;

create policy "room members can read rooms"
on public.bill_splitter_rooms for select to authenticated
using (public.is_bill_splitter_room_member(id));

create policy "room members can update rooms"
on public.bill_splitter_rooms for update to authenticated
using (public.is_bill_splitter_room_member(id))
with check (public.is_bill_splitter_room_member(id));

create policy "members can read own membership"
on public.bill_splitter_room_members for select to authenticated
using (user_id = auth.uid());

create or replace function public.create_bill_splitter_room(initial_state jsonb)
returns table(room_id uuid, room_code text, room_revision bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room public.bill_splitter_rooms;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.bill_splitter_rooms(code, state, created_by)
  values (upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), initial_state, auth.uid())
  returning * into new_room;
  insert into public.bill_splitter_room_members(room_id, user_id)
  values (new_room.id, auth.uid());
  return query select new_room.id, new_room.code, new_room.revision;
end;
$$;

create or replace function public.join_bill_splitter_room(requested_code text)
returns table(room_id uuid, room_code text, room_state jsonb, room_revision bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.bill_splitter_rooms;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into target from public.bill_splitter_rooms
  where code = upper(trim(requested_code));
  if target.id is null then raise exception 'room not found'; end if;
  insert into public.bill_splitter_room_members(room_id, user_id)
  values (target.id, auth.uid()) on conflict do nothing;
  return query select target.id, target.code, target.state, target.revision;
end;
$$;

create or replace function public.update_bill_splitter_room(
  target_room_id uuid,
  expected_revision bigint,
  next_state jsonb
)
returns table(room_state jsonb, room_revision bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.bill_splitter_rooms;
begin
  if not public.is_bill_splitter_room_member(target_room_id) then
    raise exception 'room membership required';
  end if;
  update public.bill_splitter_rooms
  set state = next_state, revision = revision + 1, updated_at = now()
  where id = target_room_id and revision = expected_revision
  returning * into updated;
  if updated.id is null then raise exception 'revision conflict'; end if;
  return query select updated.state, updated.revision;
end;
$$;

revoke all on function public.create_bill_splitter_room(jsonb) from public;
revoke all on function public.join_bill_splitter_room(text) from public;
revoke all on function public.update_bill_splitter_room(uuid, bigint, jsonb) from public;
grant execute on function public.create_bill_splitter_room(jsonb) to authenticated;
grant execute on function public.join_bill_splitter_room(text) to authenticated;
grant execute on function public.update_bill_splitter_room(uuid, bigint, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bill_splitter_rooms'
  ) then
    alter publication supabase_realtime add table public.bill_splitter_rooms;
  end if;
end $$;
