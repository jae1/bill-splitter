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
  values (
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    initial_state,
    auth.uid()
  )
  returning * into new_room;
  insert into public.bill_splitter_room_members(room_id, user_id)
  values (new_room.id, auth.uid());
  return query select new_room.id, new_room.code, new_room.revision;
end;
$$;

revoke all on function public.create_bill_splitter_room(jsonb) from public;
grant execute on function public.create_bill_splitter_room(jsonb) to authenticated;
