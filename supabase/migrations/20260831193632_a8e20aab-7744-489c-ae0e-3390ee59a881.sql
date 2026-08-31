create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from public.profiles where role = 'admin') then
    return false;
  end if;
  update public.profiles set role = 'admin' where id = auth.uid();
  return true;
end;
$$;

revoke all on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;