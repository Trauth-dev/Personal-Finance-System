-- Endurece las funciones SECURITY INVOKER restantes:
--   * search_path fijo (evita secuestro de nombres)
--   * funciones trigger: nadie puede invocarlas como RPC (los triggers siguen
--     disparándose, Postgres solo valida EXECUTE al crear el trigger)
--   * RPC emp_*: solo usuarios autenticados, nunca anon

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as firma, t.typname as retorno, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type t on t.oid = p.prorettype
    where n.nspname = 'public'
      and p.prosecdef = false
      and p.prokind = 'f'
      and (
        t.typname = 'trigger'
        or p.proname in (
          'emp_eliminar_compra', 'emp_eliminar_venta', 'emp_guardar_compra',
          'emp_guardar_venta', 'emp_perfil_propio', 'emp_registrar_pago',
          'emp_revertir_compra', 'emp_revertir_venta', 'get_tasa_cambio_actual'
        )
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.firma);
    execute format('revoke execute on function %s from public, anon', f.firma);

    if f.retorno = 'trigger' then
      execute format('revoke execute on function %s from authenticated', f.firma);
    else
      execute format('grant execute on function %s to authenticated', f.firma);
    end if;
  end loop;
end
$$;

-- Redundante: service_role ya ignora RLS. Se elimina para que ninguna política
-- dependa de un claim de rol en lugar de la identidad del usuario.
drop policy if exists "Service role can manage all plan access" on public.user_plan_access;

-- Funciones nuevas creadas en public no quedan ejecutables por anon por defecto
alter default privileges in schema public revoke execute on functions from public, anon;
