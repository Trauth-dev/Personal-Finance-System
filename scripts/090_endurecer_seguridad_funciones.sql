-- Auditoría de seguridad (nov 2026): cierra funciones SECURITY DEFINER expuestas.

begin;

-- 1) Los triggers de stock sólo pueden tocar el inventario del dueño de la venta.
--    Antes bastaba con conocer el id de un producto ajeno para alterar su stock.
create or replace function public.descontar_stock_venta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.producto_id is not null and new.cantidad is not null then
    update public.inventario
       set stock_actual = stock_actual - new.cantidad,
           updated_at = now()
     where id = new.producto_id
       and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create or replace function public.restaurar_stock_venta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.producto_id is not null and old.cantidad is not null then
    update public.inventario
       set stock_actual = stock_actual + old.cantidad,
           updated_at = now()
     where id = old.producto_id
       and user_id = old.user_id;
  end if;
  return old;
end;
$$;

-- 2) Recibía un user_id arbitrario y era invocable por cualquiera (incluso sin sesión):
--    permitía insertar etapas en el pipeline de otro usuario. La app no la usa vía RPC.
alter function public.crear_etapas_pipeline_defecto(uuid) set search_path = public;
revoke execute on function public.crear_etapas_pipeline_defecto(uuid) from public, anon, authenticated;

-- 3) Devolvía la tasa de cambio de cualquier usuario a partir de su id.
--    Como SECURITY INVOKER queda sujeta a RLS: cada uno sólo ve la propia.
alter function public.get_tasa_cambio_actual(uuid, text, text) security invoker;
alter function public.get_tasa_cambio_actual(uuid, text, text) set search_path = public;
revoke execute on function public.get_tasa_cambio_actual(uuid, text, text) from public, anon;

-- 4) Funciones de trigger: search_path fijo y sin ejecución directa desde la API.
--    Los triggers siguen disparándose igual (el permiso EXECUTE no aplica al disparo).
alter function public.create_default_perfil() set search_path = public;
alter function public.handle_new_user_plan_access() set search_path = public;
alter function public.insert_default_categories() set search_path = public;

revoke execute on function public.create_default_perfil() from public, anon, authenticated;
revoke execute on function public.handle_new_user_plan_access() from public, anon, authenticated;
revoke execute on function public.insert_default_categories() from public, anon, authenticated;
revoke execute on function public.proteger_campos_admin_profiles() from public, anon, authenticated;
revoke execute on function public.descontar_stock_venta() from public, anon, authenticated;
revoke execute on function public.restaurar_stock_venta() from public, anon, authenticated;

commit;
