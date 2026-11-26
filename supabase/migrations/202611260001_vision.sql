create table public.vision_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) between 1 and 120),
  kind text not null check (kind in ('profile','workout','measure','meal','water','targets','active','reminder')),
  value jsonb check (value is null or (jsonb_typeof(value) = 'object' and pg_column_size(value) <= 2097152)),
  primary key (user_id, key)
);
alter table public.vision_entries enable row level security;
revoke all on public.vision_entries from anon, authenticated;
grant select, insert, update on public.vision_entries to authenticated;
create policy own_entries on public.vision_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.vision_catalog (
  id text primary key,
  exercise jsonb not null check (jsonb_typeof(exercise) = 'object' and (exercise->>'id') is not distinct from id)
);
alter table public.vision_catalog enable row level security;
revoke all on public.vision_catalog from anon, authenticated;
grant select on public.vision_catalog to anon, authenticated;
grant insert, update, delete on public.vision_catalog to authenticated;
create policy read_catalog on public.vision_catalog for select to anon, authenticated using (true);
create policy manage_catalog on public.vision_catalog for all to authenticated
  using ((select auth.jwt())->'app_metadata'->>'vision_admin' = 'true')
  with check ((select auth.jwt())->'app_metadata'->>'vision_admin' = 'true');

create function public.delete_vision_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_vision_account() from public, anon;
grant execute on function public.delete_vision_account() to authenticated;
