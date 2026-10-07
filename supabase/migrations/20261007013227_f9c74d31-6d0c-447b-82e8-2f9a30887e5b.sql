-- Relatos: only service-side submission; public reads approved stories only.
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 60),
  city text check (city is null or char_length(city) <= 80),
  rating integer not null check (rating between 1 and 5),
  story text not null check (char_length(story) between 30 and 2000),
  consent_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null,
  check (status <> 'approved' or reviewed_at is not null)
);
alter table public.testimonials enable row level security;
revoke all on public.testimonials from anon, authenticated;
grant all on public.testimonials to service_role;
grant select (id,display_name,city,rating,story,created_at,reviewed_at,status) on public.testimonials to anon, authenticated;
create policy testimonials_public on public.testimonials for select using (status = 'approved');
create policy testimonials_admin on public.testimonials for select to authenticated using (public.is_admin());
create index testimonials_status_date on public.testimonials(status, created_at desc);

create table public.institution_claims (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact text not null check (char_length(contact) between 5 and 200),
  message text not null check (char_length(message) between 20 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null
);
alter table public.institution_claims enable row level security;
revoke all on public.institution_claims from anon, authenticated;
grant all on public.institution_claims to service_role;
grant select on public.institution_claims to authenticated;
create policy institution_claims_read on public.institution_claims for select to authenticated using (user_id=auth.uid() or public.is_admin());
create unique index institution_claim_pending on public.institution_claims(point_id,user_id) where status='pending';

-- Approval and ownership transfer happen atomically under admin authorization.
create or replace function public.review_institution_claim(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare claim public.institution_claims; owner_id uuid;
begin
  if not public.is_admin() then raise exception 'Acesso restrito'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  select * into claim from public.institution_claims where id=p_id for update;
  if not found or claim.status <> 'pending' then raise exception 'Solicitação já revisada ou inexistente'; end if;
  if p_status='approved' then
    select claimed_by into owner_id from public.collection_points where id=claim.point_id for update;
    if owner_id is not null and owner_id<>claim.user_id then raise exception 'Instituição já possui responsável'; end if;
    update public.collection_points set claimed_by=claim.user_id where id=claim.point_id;
  end if;
  update public.institution_claims set status=p_status,reviewed_at=now(),reviewed_by=auth.uid() where id=p_id;
end $$;
revoke all on function public.review_institution_claim(uuid,text) from public;
grant execute on function public.review_institution_claim(uuid,text) to authenticated;

-- Public results remain scoped and paginated, including proximity and cause filters.
create or replace function public.search_public_points_page(
 p_lat double precision,p_lng double precision,p_radius double precision,
 p_city text,p_neighborhood text,p_cause uuid,p_page integer
) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_radius not between 1 and 100 or p_page not between 1 and 10000 then raise exception 'Busca inválida'; end if;
 with distances as (
   select cp.id,cp.name,cp.description,cp.address,cp.city,cp.state,cp.lat,cp.lng,
     cp.phone,cp.whatsapp,cp.website,cp.photo_url,cp.opening_hours,cp.donation_method,
     cp.confirmation_status,cp.confirmed_at,
     6371*2*asin(sqrt(least(1.0,power(sin(radians(cp.lat-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(cp.lat))*power(sin(radians(cp.lng-p_lng)/2),2)))) as distance_km
   from public.collection_points cp
   where cp.state='SP' and cp.is_active and cp.curation_status='verified'
   and (p_city='' or cp.city ilike '%'||replace(replace(replace(p_city,'\',''),'%', ''),'_','')||'%')
   and (p_neighborhood='' or cp.address ilike '%'||replace(replace(replace(p_neighborhood,'\',''),'%', ''),'_','')||'%')
   and (p_cause is null or exists(select 1 from public.point_causes pc where pc.point_id=cp.id and pc.cause_id=p_cause))
 ), matches as (select * from distances where distance_km<=p_radius),
 page as (select * from matches order by distance_km,id limit 30 offset (p_page-1)*30)
 select jsonb_build_object('total',(select count(*) from matches),'points',coalesce((select jsonb_agg(to_jsonb(page) order by distance_km,id) from page),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.search_public_points_page(double precision,double precision,double precision,text,text,uuid,integer) from public;
grant execute on function public.search_public_points_page(double precision,double precision,double precision,text,text,uuid,integer) to anon,authenticated;

CREATE OR REPLACE FUNCTION public.consume_request_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF p_scope NOT IN ('help_request', 'volunteer_application', 'assistant_question', 'team_invite_activation', 'testimonial_submission', 'institution_claim')
     OR length(p_identifier_hash) <> 64
     OR p_limit < 1
     OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Parâmetros de limitação inválidos.';
  END IF;

  DELETE FROM public.request_rate_limits WHERE expires_at <= now();

  INSERT INTO public.request_rate_limits AS limits (
    scope, identifier_hash, request_count, expires_at, updated_at
  ) VALUES (
    p_scope, p_identifier_hash, 1, now() + make_interval(secs => p_window_seconds), now()
  )
  ON CONFLICT (scope, identifier_hash) DO UPDATE SET
    request_count = CASE
      WHEN limits.expires_at <= now() THEN 1
      ELSE limits.request_count + 1
    END,
    expires_at = CASE
      WHEN limits.expires_at <= now() THEN now() + make_interval(secs => p_window_seconds)
      ELSE limits.expires_at
    END,
    updated_at = now()
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

alter table public.point_needs add column expires_at date;
drop policy if exists point_needs_public_select on public.point_needs;
create policy point_needs_public_select on public.point_needs for select to anon
using (is_active and (expires_at is null or expires_at >= (now() at time zone 'America/Sao_Paulo')::date)
 and exists(select 1 from public.collection_points cp where cp.id=point_id and cp.is_active and cp.curation_status='verified' and cp.state='SP'));
drop policy if exists point_needs_select on public.point_needs;
create policy point_needs_select on public.point_needs for select to authenticated
using (public.is_admin() or private.has_team_permission('needs_management',auth.uid())
 or exists(select 1 from public.collection_points cp where cp.id=point_id and
 (cp.claimed_by=auth.uid() or cp.submitted_by=auth.uid() or
 (cp.state='SP' and cp.is_active and cp.curation_status='verified' and point_needs.is_active and (expires_at is null or expires_at >= (now() at time zone 'America/Sao_Paulo')::date)))));