-- 093: Prueba gratuita de 30 días para cuentas nuevas, correo de cuenta
-- inmutable y eliminación segura de cuentas (los pagos se conservan).
-- Idempotente: se puede ejecutar más de una vez.

begin;

-- 1. Fecha de fin de la prueba gratuita (null = cuenta anterior al sistema de prueba).
alter table public.profiles add column if not exists prueba_vence timestamptz;

-- 2. Registro de correos que ya usaron la prueba. Evita que alguien borre la
--    cuenta y se registre de nuevo con el mismo correo para otra prueba.
create table if not exists public.pruebas_usadas (
  email text primary key,
  usada_at timestamptz not null default now()
);
alter table public.pruebas_usadas enable row level security;
revoke all on public.pruebas_usadas from anon, authenticated;

insert into public.pruebas_usadas (email)
select lower(email) from auth.users where email is not null
on conflict do nothing;

-- 3. Protección de campos administrativos + asignación de la prueba.
create or replace function public.proteger_campos_admin_profiles()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_creado timestamptz;
  v_email text;
  v_corte constant timestamptz := '2026-11-13 00:00:00-03';
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.estado_cuenta := 'activo';
      new.estado_motivo := null;
      new.estado_actualizado_at := null;
      new.observaciones := null;
      new.suscripcion_vence := null;
      new.plan_tier := 'basico';
      new.prueba_vence := null;
    else
      new.estado_cuenta := old.estado_cuenta;
      new.estado_motivo := old.estado_motivo;
      new.estado_actualizado_at := old.estado_actualizado_at;
      new.observaciones := old.observaciones;
      new.suscripcion_vence := old.suscripcion_vence;
      new.plan_tier := old.plan_tier;
      new.prueba_vence := old.prueba_vence;
      new.email := old.email;
    end if;
  end if;

  if tg_op = 'INSERT' and new.prueba_vence is null then
    select created_at, lower(email) into v_creado, v_email from auth.users where id = new.id;
    if v_creado is not null and v_creado >= v_corte then
      if v_email is not null and exists (
        select 1 from public.pruebas_usadas where email = v_email and usada_at < v_creado
      ) then
        new.prueba_vence := now();
      else
        new.prueba_vence := v_creado + interval '30 days';
        if v_email is not null then
          insert into public.pruebas_usadas (email, usada_at) values (v_email, v_creado)
          on conflict (email) do nothing;
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$function$;

update public.profiles p
set prueba_vence = u.created_at + interval '30 days'
from auth.users u
where u.id = p.id and p.prueba_vence is null and u.created_at >= '2026-11-13 00:00:00-03';

-- 4. El correo de la cuenta no se puede cambiar desde la app del usuario.
--    (El administrador puede corregirlo con la API de servicio, que no usa email_change.)
create or replace function public.bloquear_cambio_email()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if coalesce(new.email_change, '') <> ''
     and coalesce(new.email_change, '') is distinct from coalesce(old.email_change, '') then
    raise exception 'El correo de la cuenta no se puede cambiar' using errcode = 'P0001';
  end if;
  return new;
end;
$function$;
revoke all on function public.bloquear_cambio_email() from public, anon, authenticated;

drop trigger if exists trg_bloquear_cambio_email on auth.users;
create trigger trg_bloquear_cambio_email
  before update of email_change on auth.users
  for each row execute function public.bloquear_cambio_email();

-- 5. Al eliminar una cuenta, los pagos se conservan para la contabilidad.
alter table public.pagos add column if not exists user_email text;
update public.pagos pg set user_email = lower(u.email)
from auth.users u where u.id = pg.user_id and pg.user_email is null;
alter table public.pagos alter column user_id drop not null;
alter table public.pagos drop constraint if exists pagos_user_id_fkey;
alter table public.pagos
  add constraint pagos_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

commit;
