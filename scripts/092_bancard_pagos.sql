-- 092: Integración Bancard vPOS 2.0 (compra simple).
-- Aditiva e idempotente: no borra ni modifica datos existentes.

-- 1) Columnas nuevas en pagos -----------------------------------------------
alter table public.pagos add column if not exists proveedor text not null default 'pagopar';
alter table public.pagos add column if not exists entorno text not null default 'production';
alter table public.pagos add column if not exists shop_process_id bigint;
alter table public.pagos add column if not exists process_id text;
alter table public.pagos add column if not exists authorization_number text;
alter table public.pagos add column if not exists ticket_number text;
alter table public.pagos add column if not exists response_code text;
alter table public.pagos add column if not exists response_description text;
alter table public.pagos add column if not exists duracion_dias integer not null default 30;
alter table public.pagos add column if not exists confirmado_at timestamptz;
alter table public.pagos add column if not exists vence_anterior timestamptz;
alter table public.pagos add column if not exists vence_nuevo timestamptz;
alter table public.pagos add column if not exists tier_anterior text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pagos_proveedor_check') then
    alter table public.pagos add constraint pagos_proveedor_check check (proveedor in ('pagopar', 'bancard'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pagos_entorno_check') then
    alter table public.pagos add constraint pagos_entorno_check check (entorno in ('staging', 'production'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pagos_shop_process_id_key') then
    alter table public.pagos add constraint pagos_shop_process_id_key unique (shop_process_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pagos_process_id_key') then
    alter table public.pagos add constraint pagos_process_id_key unique (process_id);
  end if;
end $$;

create sequence if not exists public.pagos_shop_process_id_seq start with 100001;
create index if not exists idx_pagos_user_estado on public.pagos (user_id, proveedor, estado, created_at desc);

-- Los usuarios solo leen sus pagos (policy existente). Escritura: solo service_role.
revoke insert, update, delete, truncate on public.pagos from anon, authenticated;

-- 2) Bitácora de eventos de pago (solo servidor) ----------------------------
create table if not exists public.pagos_eventos (
  id bigint generated always as identity primary key,
  pago_id uuid references public.pagos(id) on delete set null,
  shop_process_id bigint,
  proveedor text not null default 'bancard',
  entorno text not null,
  tipo text not null,
  firma_valida boolean,
  resultado text,
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_pagos_eventos_spid on public.pagos_eventos (shop_process_id, created_at desc);
alter table public.pagos_eventos enable row level security;
revoke all on public.pagos_eventos from anon, authenticated;

-- 3) Reserva de pago (anti doble clic / refresh) -----------------------------
-- Reutiliza un pago pendiente del mismo plan y entorno creado en los últimos
-- p_ventana_min minutos; si no hay, crea uno nuevo con shop_process_id único.
create or replace function public.bancard_reservar_pago(
  p_user_id uuid, p_plan_id text, p_monto integer, p_entorno text, p_ventana_min integer default 10
) returns table (pago_id uuid, shop_process_id bigint, process_id text, nuevo boolean)
language plpgsql
set search_path = public
as $$
declare
  v_row public.pagos%rowtype;
  v_spid bigint;
begin
  perform pg_advisory_xact_lock(hashtext('bancard:' || p_user_id::text));

  select * into v_row from public.pagos p
   where p.user_id = p_user_id and p.proveedor = 'bancard' and p.entorno = p_entorno
     and p.plan_id = p_plan_id and p.monto = p_monto and p.estado = 'pendiente'
     and p.created_at > now() - make_interval(mins => p_ventana_min)
   order by p.created_at desc limit 1;

  if found then
    return query select v_row.id, v_row.shop_process_id, v_row.process_id, false;
    return;
  end if;

  v_spid := nextval('public.pagos_shop_process_id_seq');
  insert into public.pagos (user_id, id_pedido_comercio, plan_id, monto, moneda, estado, proveedor, entorno, shop_process_id)
  values (p_user_id, 'bancard-' || v_spid, p_plan_id, p_monto, 'PYG', 'pendiente', 'bancard', p_entorno, v_spid)
  returning * into v_row;

  return query select v_row.id, v_row.shop_process_id, v_row.process_id, true;
end $$;

-- 4) Aplicar confirmación (atómico e idempotente) ----------------------------
-- Bloquea la fila del pago, valida monto/moneda/entorno, y si está aprobado
-- extiende la suscripción y los perfiles en la MISMA transacción.
create or replace function public.bancard_aplicar_confirmacion(
  p_shop_process_id bigint,
  p_aprobado boolean,
  p_monto numeric,
  p_moneda text,
  p_entorno text,
  p_activacion_permitida boolean,
  p_response_code text,
  p_response_description text,
  p_authorization_number text,
  p_ticket_number text,
  p_origen text,
  p_detalle jsonb
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_pago public.pagos%rowtype;
  v_vence timestamptz;
  v_tier text;
  v_base timestamptz;
  v_nuevo timestamptz;
  v_total boolean;
  v_resultado text;
begin
  select * into v_pago from public.pagos where shop_process_id = p_shop_process_id and proveedor = 'bancard' for update;

  if not found then
    insert into public.pagos_eventos (shop_process_id, entorno, tipo, firma_valida, resultado, detalle)
    values (p_shop_process_id, p_entorno, p_origen, true, 'pago_desconocido', p_detalle);
    return jsonb_build_object('resultado', 'desconocido');
  end if;

  if v_pago.estado in ('pagado', 'rechazado', 'cancelado', 'revertido', 'error_conciliacion') then
    insert into public.pagos_eventos (pago_id, shop_process_id, entorno, tipo, firma_valida, resultado, detalle)
    values (v_pago.id, p_shop_process_id, v_pago.entorno, p_origen, true, 'duplicado_ignorado', p_detalle);
    return jsonb_build_object('resultado', 'ya_procesado', 'estado', v_pago.estado);
  end if;

  if p_monto is distinct from v_pago.monto::numeric or upper(coalesce(p_moneda, '')) <> 'PYG' or p_entorno <> v_pago.entorno then
    update public.pagos set estado = 'error_conciliacion', response_code = p_response_code,
      response_description = 'Monto, moneda o entorno no coinciden', updated_at = now()
    where id = v_pago.id;
    insert into public.pagos_eventos (pago_id, shop_process_id, entorno, tipo, firma_valida, resultado, detalle)
    values (v_pago.id, p_shop_process_id, v_pago.entorno, p_origen, true, 'inconsistente', p_detalle);
    return jsonb_build_object('resultado', 'inconsistente');
  end if;

  if not p_aprobado then
    update public.pagos set estado = 'rechazado', response_code = p_response_code,
      response_description = p_response_description, confirmado_at = now(), updated_at = now()
    where id = v_pago.id;
    insert into public.pagos_eventos (pago_id, shop_process_id, entorno, tipo, firma_valida, resultado, detalle)
    values (v_pago.id, p_shop_process_id, v_pago.entorno, p_origen, true, 'rechazado', p_detalle);
    return jsonb_build_object('resultado', 'rechazado');
  end if;

  if not p_activacion_permitida then
    update public.pagos set estado = 'error_conciliacion', response_code = p_response_code,
      response_description = 'Cuenta no autorizada para pagos de prueba', authorization_number = p_authorization_number,
      ticket_number = p_ticket_number, confirmado_at = now(), updated_at = now()
    where id = v_pago.id;
    insert into public.pagos_eventos (pago_id, shop_process_id, entorno, tipo, firma_valida, resultado, detalle)
    values (v_pago.id, p_shop_process_id, v_pago.entorno, p_origen, true, 'activacion_bloqueada', p_detalle);
    return jsonb_build_object('resultado', 'bloqueado');
  end if;

  select suscripcion_vence, plan_tier into v_vence, v_tier from public.profiles where id = v_pago.user_id for update;
  v_base := greatest(now(), coalesce(v_vence, now()));
  v_nuevo := v_base + make_interval(days => v_pago.duracion_dias);
  v_total := v_pago.plan_id = 'total';

  update public.profiles
     set plan_tier = case when v_total then 'completo' else 'basico' end,
         suscripcion_vence = v_nuevo
   where id = v_pago.user_id;

  insert into public.user_plan_access (user_id, plan_type, is_active, granted_by)
  values (v_pago.user_id, 'personal', true, 'bancard'),
         (v_pago.user_id, 'empresarial', v_total, 'bancard'),
         (v_pago.user_id, 'crm', v_total, 'bancard')
  on conflict (user_id, plan_type) do update set is_active = excluded.is_active, granted_by = 'bancard', updated_at = now();

  update public.pagos set estado = 'pagado', forma_pago = 'bancard_vpos', fecha_pago = now(), confirmado_at = now(),
    response_code = p_response_code, response_description = p_response_description,
    authorization_number = p_authorization_number, ticket_number = p_ticket_number,
    vence_anterior = v_vence, vence_nuevo = v_nuevo, tier_anterior = v_tier, updated_at = now()
  where id = v_pago.id;

  v_resultado := 'activado';
  insert into public.pagos_eventos (pago_id, shop_process_id, entorno, tipo, firma_valida, resultado, detalle)
  values (v_pago.id, p_shop_process_id, v_pago.entorno, p_origen, true, v_resultado, p_detalle);

  return jsonb_build_object('resultado', v_resultado, 'vence_nuevo', v_nuevo, 'user_id', v_pago.user_id);
end $$;

-- 5) Marcar reverso (deshace la extensión si sigue siendo la última) ----------
create or replace function public.bancard_marcar_revertido(p_shop_process_id bigint, p_detalle jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_pago public.pagos%rowtype;
  v_restaurado boolean := false;
begin
  select * into v_pago from public.pagos where shop_process_id = p_shop_process_id and proveedor = 'bancard' for update;
  if not found then return jsonb_build_object('resultado', 'desconocido'); end if;
  if v_pago.estado = 'revertido' then return jsonb_build_object('resultado', 'ya_revertido'); end if;

  if v_pago.estado = 'pagado' and v_pago.vence_nuevo is not null then
    update public.profiles
       set suscripcion_vence = v_pago.vence_anterior, plan_tier = coalesce(v_pago.tier_anterior, plan_tier)
     where id = v_pago.user_id and suscripcion_vence = v_pago.vence_nuevo;
    v_restaurado := found;
  end if;

  update public.pagos set estado = 'revertido', updated_at = now() where id = v_pago.id;
  insert into public.pagos_eventos (pago_id, shop_process_id, entorno, tipo, firma_valida, resultado, detalle)
  values (v_pago.id, p_shop_process_id, v_pago.entorno, 'rollback', null,
          case when v_restaurado then 'revertido_y_restaurado' else 'revertido' end, p_detalle);
  return jsonb_build_object('resultado', 'revertido', 'suscripcion_restaurada', v_restaurado);
end $$;

-- Solo el servidor (service_role) puede ejecutar estas funciones.
revoke all on function public.bancard_reservar_pago(uuid, text, integer, text, integer) from public, anon, authenticated;
revoke all on function public.bancard_aplicar_confirmacion(bigint, boolean, numeric, text, text, boolean, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.bancard_marcar_revertido(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.bancard_reservar_pago(uuid, text, integer, text, integer) to service_role;
grant execute on function public.bancard_aplicar_confirmacion(bigint, boolean, numeric, text, text, boolean, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.bancard_marcar_revertido(bigint, jsonb) to service_role;
grant usage on sequence public.pagos_shop_process_id_seq to service_role;
grant all on public.pagos_eventos to service_role;
