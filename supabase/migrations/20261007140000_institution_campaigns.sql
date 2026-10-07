begin;
-- Corrections enter through validated/rate-limited server functions only.
-- This also prevents forging the institution owner's submitted_by identity.
revoke insert on public.point_corrections from anon, authenticated;

-- Campaigns extend existing needs, retaining ownership and public RLS policies.
alter table public.point_needs
  add column if not exists campaign_title text,
  add column if not exists target_quantity integer,
  add column if not exists received_quantity integer not null default 0,
  add column if not exists quantity_unit text;
alter table public.point_needs add constraint point_needs_campaign_valid check (
  (campaign_title is null and target_quantity is null and quantity_unit is null and received_quantity = 0)
  or (campaign_title is not null and target_quantity is not null and quantity_unit is not null
    and length(campaign_title) between 3 and 120 and target_quantity between 1 and 1000000
    and received_quantity between 0 and target_quantity and length(quantity_unit) between 1 and 30
    and expires_at is not null)
);

-- Review is transactional and preserves geographic/publication/ownership fields.
create or replace function public.apply_institution_proposal(p_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare c public.point_corrections%rowtype; cp public.collection_points%rowtype; proposal jsonb; patch jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso restrito.'; end if;
  select * into c from public.point_corrections where id=p_id and status='open' for update;
  if not found then raise exception 'Proposta já revisada ou ausente.'; end if;
  proposal := c.message::jsonb;
  if proposal->>'type' is distinct from 'institution_update_v1' then raise exception 'Proposta inválida.'; end if;
  select * into cp from public.collection_points where id=c.point_id for update;
  if not found or cp.claimed_by is null or cp.claimed_by is distinct from c.submitted_by then raise exception 'Vínculo não confirmado.'; end if;
  if cp.updated_at is distinct from (proposal->>'baseline_updated_at')::timestamptz then raise exception 'Cadastro alterado. Peça nova proposta.'; end if;
  patch := proposal->'patch';
  if jsonb_typeof(patch) is distinct from 'object' or patch->>'name' is null or length(patch->>'name') not between 3 and 160 then raise exception 'Dados inválidos.'; end if;
  if exists(select 1 from jsonb_object_keys(patch) as k(key) where key not in ('name','phone','whatsapp','website','opening_hours','donation_hours','description')) then raise exception 'Campo não permitido.'; end if;
  if coalesce(length(patch->>'phone'),0)>40 or coalesce(length(patch->>'whatsapp'),0)>40
    or coalesce(length(patch->>'website'),0)>300 or coalesce(length(patch->>'opening_hours'),0)>300
    or coalesce(length(patch->>'donation_hours'),0)>300 or coalesce(length(patch->>'description'),0)>500 then raise exception 'Dados excedem limites.'; end if;
  if coalesce(patch->>'website','')<>'' and (patch->>'website') !~* '^https?://' then raise exception 'Site inválido.'; end if;
  update public.collection_points set name=patch->>'name', phone=nullif(patch->>'phone',''), whatsapp=nullif(patch->>'whatsapp',''),
    website=nullif(patch->>'website',''), opening_hours=nullif(patch->>'opening_hours',''), donation_hours=nullif(patch->>'donation_hours',''), description=nullif(patch->>'description','') where id=cp.id;
  update public.point_corrections set status='resolved' where id=c.id;
  insert into public.admin_audit_log(actor_id,action,entity,entity_id,details) values(auth.uid(),'institution_update','collection_points',cp.id,jsonb_build_object('proposal_id',c.id));
end $$;
revoke all on function public.apply_institution_proposal(uuid) from public, anon;
grant execute on function public.apply_institution_proposal(uuid) to authenticated;

create or replace function public.close_completed_campaign() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.target_quantity is not null and new.received_quantity >= new.target_quantity then new.is_active := false; end if;
  return new;
end $$;
create trigger point_needs_close_completed_campaign before insert or update on public.point_needs
for each row execute function public.close_completed_campaign();

commit;
