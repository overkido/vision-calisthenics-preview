-- Execute inside a disposable test database as the migration owner.
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.vision_entries values ('00000000-0000-0000-0000-000000000001', 'profile', 'profile', '{"name":"Atleta A"}');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","user_metadata":{"vision_admin":true}}', true);
do $$
begin
  if exists (select 1 from public.vision_entries) then raise exception 'cross-account read permitted'; end if;
  begin
    insert into public.vision_entries values ('00000000-0000-0000-0000-000000000001', 'workout:x', 'workout', '{}');
    raise exception 'cross-account write permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.vision_catalog values ('test', '{"id":"test"}');
    raise exception 'user could self-assign admin access';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"vision_admin":true}}', true);
insert into public.vision_catalog values ('test', '{"id":"test"}');
do $$
begin
  if not exists (select 1 from public.vision_catalog where id = 'test') then raise exception 'admin catalog write missing'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.delete_vision_account();
reset role;
do $$
begin
  if exists (select 1 from public.vision_entries) then raise exception 'account deletion left personal data'; end if;
  if not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000002') then raise exception 'account deletion touched another account'; end if;
end $$;
rollback;
