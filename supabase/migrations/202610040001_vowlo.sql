-- Apply in the Supabase SQL editor. Never put database/admin credentials in the app.
begin;
create table public.weddings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2500000),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.weddings enable row level security;
alter table public.weddings force row level security;
revoke all on public.weddings from anon, authenticated;
grant select, insert, update on public.weddings to authenticated;
create policy own_read on public.weddings for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.weddings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.weddings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Server owns revisions. Payload deletion is a revisioned empty document (no stale resurrection).
create function public.vowlo_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then new.revision := 1;
  else new.revision := old.revision + 1; end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger vowlo_revision before insert or update on public.weddings for each row execute function public.vowlo_revision();
-- Atomic compare-and-swap; caller never supplies an owner ID. RLS still applies.
create function public.save_wedding(p_payload jsonb, p_expected_revision bigint)
returns setof public.weddings language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_expected_revision = 0 then
    return query insert into public.weddings(user_id,payload) values(auth.uid(),p_payload)
      on conflict (user_id) do nothing returning *;
  else
    return query update public.weddings set payload=p_payload
      where user_id=auth.uid() and revision=p_expected_revision returning *;
  end if;
end;
$$;
revoke all on function public.save_wedding(jsonb,bigint) from public,anon;
grant execute on function public.save_wedding(jsonb,bigint) to authenticated;
-- Narrow self-service deletion; no admin key is exposed to a browser.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public,anon;
grant execute on function public.delete_my_account() to authenticated;
commit;
