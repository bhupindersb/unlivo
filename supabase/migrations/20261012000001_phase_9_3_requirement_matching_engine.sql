create or replace function public.get_buyer_requirement_matches(p_requirement_id uuid,p_limit integer default 24)
returns table(property_id uuid,title text,city text,locality text,price numeric,rent_monthly numeric,purpose listing_purpose,category property_category,property_type text,bedrooms smallint,area_sqft numeric,possession possession_status,furnishing furnishing_status,status property_status,match_score integer,match_reasons jsonb)
language plpgsql security definer set search_path=public as $$
declare r buyer_requirements%rowtype;
begin
 select * into r from public.buyer_requirements where id=p_requirement_id and user_id=auth.uid();
 if not found then raise exception 'Requirement not found or access denied'; end if;
 return query
 with c as (
  select p.*,
   case when p.purpose=r.purpose then 20 else 0 end pp,
   case when p.category=r.category then 15 else 0 end cp,
   case when coalesce(array_length(r.property_types,1),0)=0 then 0 when exists(select 1 from unnest(r.property_types) x where lower(x)=lower(coalesce(p.property_type,''))) then 15 else 0 end tp,
   case when coalesce(array_length(r.preferred_cities,1),0)=0 then 0 when exists(select 1 from unnest(r.preferred_cities) x where lower(x)=lower(coalesce(p.city,''))) then 20 else 0 end cityp,
   case when coalesce(array_length(r.preferred_localities,1),0)=0 then 0 when exists(select 1 from unnest(r.preferred_localities) x where lower(coalesce(p.locality,'')) like '%'||lower(x)||'%' or lower(x) like '%'||lower(coalesce(p.locality,''))||'%') then 10 else 0 end lp,
   case when r.min_price is null and r.max_price is null then 0 when (case when p.purpose='rent' then p.rent_monthly else p.price end) is null then 0 when (r.min_price is null or (case when p.purpose='rent' then p.rent_monthly else p.price end)>=r.min_price) and (r.max_price is null or (case when p.purpose='rent' then p.rent_monthly else p.price end)<=r.max_price) then 10 else 0 end bp,
   case when r.min_bedrooms is null and r.max_bedrooms is null then 0 when p.bedrooms is null then 0 when (r.min_bedrooms is null or p.bedrooms>=r.min_bedrooms) and (r.max_bedrooms is null or p.bedrooms<=r.max_bedrooms) then 5 else 0 end bp2,
   case when r.min_area_sqft is null and r.max_area_sqft is null then 0 when p.area_sqft is null then 0 when (r.min_area_sqft is null or p.area_sqft>=r.min_area_sqft) and (r.max_area_sqft is null or p.area_sqft<=r.max_area_sqft) then 5 else 0 end ap,
   (case when p.purpose='rent' then p.rent_monthly else p.price end) mv
  from public.properties p
  where p.status='published' and p.listed_by<>auth.uid() and p.purpose=r.purpose and p.category=r.category
 ),s as (
  select c.*,pp+cp+tp+cityp+lp+bp+bp2+ap raw,
   35+
   case when coalesce(array_length(r.property_types,1),0)=0 then 0 else 15 end+
   case when coalesce(array_length(r.preferred_cities,1),0)=0 then 0 else 20 end+
   case when coalesce(array_length(r.preferred_localities,1),0)=0 then 0 else 10 end+
   case when r.min_price is null and r.max_price is null then 0 else 10 end+
   case when r.min_bedrooms is null and r.max_bedrooms is null then 0 else 5 end+
   case when r.min_area_sqft is null and r.max_area_sqft is null then 0 else 5 end mx
  from c
 )
 select id,title,city,locality,price,rent_monthly,purpose,category,property_type,bedrooms,area_sqft,possession,furnishing,status,
  case when mx=0 then 0 else round(raw::numeric/mx::numeric*100)::integer end,
  jsonb_build_array(
   jsonb_build_object('label','Purpose','detail',case when pp>0 then 'Listing purpose matches' else 'Purpose does not match' end,'ok',pp>0,'neutral',false),
   jsonb_build_object('label','Category','detail',case when cp>0 then 'Property category matches' else 'Category does not match' end,'ok',cp>0,'neutral',false),
   jsonb_build_object('label','Property type','detail',case when coalesce(array_length(r.property_types,1),0)=0 then 'No specific property type requested' when tp>0 then coalesce(property_type,'Property type matches') else coalesce(property_type,'Property type is different') end,'ok',tp>0,'neutral',coalesce(array_length(r.property_types,1),0)=0),
   jsonb_build_object('label','Location','detail',case when coalesce(array_length(r.preferred_cities,1),0)=0 then 'No specific city requested' when cityp>0 then coalesce(locality||', ','')||coalesce(city,'City matches') else coalesce(city,'City is outside preferred cities') end,'ok',cityp>0,'neutral',coalesce(array_length(r.preferred_cities,1),0)=0),
   jsonb_build_object('label','Locality','detail',case when coalesce(array_length(r.preferred_localities,1),0)=0 then 'No specific locality requested' when lp>0 then coalesce(locality,'Locality matches') else coalesce(locality,'Locality is different') end,'ok',lp>0,'neutral',coalesce(array_length(r.preferred_localities,1),0)=0),
   jsonb_build_object('label','Budget','detail',case when r.min_price is null and r.max_price is null then 'No budget preference' when mv is null then 'Price is not specified on listing' when bp>0 then 'Within requested budget' else 'Outside requested budget' end,'ok',bp>0,'neutral',r.min_price is null and r.max_price is null),
   jsonb_build_object('label','Bedrooms','detail',case when r.min_bedrooms is null and r.max_bedrooms is null then 'No bedroom preference' when bedrooms is null then 'Bedrooms are not specified on listing' when bp2>0 then bedrooms::text||' bedrooms matches' else bedrooms::text||' bedrooms is outside requested range' end,'ok',bp2>0,'neutral',r.min_bedrooms is null and r.max_bedrooms is null),
   jsonb_build_object('label','Size','detail',case when r.min_area_sqft is null and r.max_area_sqft is null then 'No size preference' when area_sqft is null then 'Area is not specified on listing' when ap>0 then area_sqft::text||' sq ft matches' else area_sqft::text||' sq ft is outside requested range' end,'ok',ap>0,'neutral',r.min_area_sqft is null and r.max_area_sqft is null)
  )
 from s order by case when raw=mx then 0 else 1 end,raw desc,created_at desc limit greatest(1,least(coalesce(p_limit,24),100));
end; $$;
revoke all on function public.get_buyer_requirement_matches(uuid,integer) from public;
grant execute on function public.get_buyer_requirement_matches(uuid,integer) to authenticated;