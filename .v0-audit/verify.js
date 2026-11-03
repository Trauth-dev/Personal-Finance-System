const { Client } = require('pg')

const TABLAS_REFERENCIA = new Set(['categorias_predefinidas', 'tasas_cambio', 'tipos_categoria_egreso'])
const resultados = []
const check = (nombre, ok, detalle = '') => resultados.push({ nombre, ok, detalle })

async function main() {
  const c = new Client({
    connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/, ''),
    ssl: { rejectUnauthorized: false },
  })
  await c.connect()

  const tablas = (
    await c.query(`select c.relname t, c.relrowsecurity rls, c.relforcerowsecurity
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p') order by 1`)
  ).rows

  const sinRls = tablas.filter((t) => !t.rls).map((t) => t.t)
  check('RLS activo en todas las tablas', sinRls.length === 0, sinRls.join(', '))

  const politicas = (
    await c.query(`select tablename t, policyname p, cmd, roles::text r, coalesce(qual,'') q, coalesce(with_check,'') w
      from pg_policies where schemaname='public'`)
  ).rows

  const escriturasAbiertas = politicas.filter(
    (p) => p.cmd !== 'SELECT' && (/^\(?true\)?$/.test(p.q.trim()) || /^\(?true\)?$/.test(p.w.trim())),
  )
  check('Ninguna política de escritura con USING/CHECK true', escriturasAbiertas.length === 0,
    escriturasAbiertas.map((p) => `${p.t}.${p.p}`).join(', '))

  const sinIdentidad = politicas.filter(
    (p) => !TABLAS_REFERENCIA.has(p.t) && !/auth\.uid\(\)|es_admin|is_admin|emp_perfil_propio/.test(p.q + p.w),
  )
  check('Toda política de datos de usuario filtra por auth.uid()', sinIdentidad.length === 0,
    sinIdentidad.map((p) => `${p.t}.${p.p} [${p.cmd}]`).join(', '))

  const lecturaPublicaNoRef = politicas.filter(
    (p) => p.cmd === 'SELECT' && /^\(?true\)?$/.test(p.q.trim()) && !TABLAS_REFERENCIA.has(p.t),
  )
  check('Lectura pública solo en tablas de referencia', lecturaPublicaNoRef.length === 0,
    lecturaPublicaNoRef.map((p) => p.t).join(', '))

  const funciones = (
    await c.query(`select p.proname, p.prosecdef d, p.proconfig cfg, t.typname ret,
        has_function_privilege('anon',p.oid,'EXECUTE') anon,
        has_function_privilege('authenticated',p.oid,'EXECUTE') auth
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type t on t.oid=p.prorettype
      where n.nspname='public' and p.prokind='f'`)
  ).rows

  const sinSearchPath = funciones.filter((f) => !(f.cfg || []).some((x) => x.startsWith('search_path=')))
  check('search_path fijo en todas las funciones', sinSearchPath.length === 0,
    sinSearchPath.map((f) => f.proname).join(', '))

  const anonEjecuta = funciones.filter((f) => f.anon)
  check('Ninguna función ejecutable por anon', anonEjecuta.length === 0, anonEjecuta.map((f) => f.proname).join(', '))

  const triggersRpc = funciones.filter((f) => f.ret === 'trigger' && f.auth)
  check('Funciones trigger no invocables como RPC', triggersRpc.length === 0, triggersRpc.map((f) => f.proname).join(', '))

  const definerAdmin = funciones.filter((f) => f.d && /^admin_/.test(f.proname) && f.auth)
  check('Funciones admin_* solo vía service role', definerAdmin.length === 0, definerAdmin.map((f) => f.proname).join(', '))

  // Prueba de comportamiento: impersonar roles dentro de una transacción que se revierte
  const tablasUsuario = tablas.map((t) => t.t).filter((t) => !TABLAS_REFERENCIA.has(t))

  for (const rol of ['anon', 'authenticated']) {
    const filtradas = []
    await c.query('begin')
    try {
      await c.query(`set local role ${rol}`)
      const sub = rol === 'anon' ? '' : '00000000-0000-4000-8000-0000deadbeef'
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify(sub ? { sub, role: rol } : { role: rol }),
      ])
      for (const t of tablasUsuario) {
        await c.query('savepoint s')
        try {
          const r = await c.query(`select count(*)::int n from public."${t}"`)
          if (r.rows[0].n > 0) filtradas.push(`${t}(${r.rows[0].n})`)
          await c.query('release savepoint s')
        } catch {
          await c.query('rollback to savepoint s')
        }
      }
    } finally {
      await c.query('rollback')
    }
    check(
      rol === 'anon'
        ? `Visitante sin sesión ve 0 filas en ${tablasUsuario.length} tablas`
        : `Usuario ajeno ve 0 filas de otros en ${tablasUsuario.length} tablas`,
      filtradas.length === 0,
      filtradas.join(', '),
    )
  }

  // Intento de escritura cruzada: usuario ajeno intenta insertar a nombre de otro
  await c.query('begin')
  let escrituraBloqueada = false
  try {
    const victima = (await c.query(`select user_id from public.ingresos limit 1`)).rows[0]?.user_id
    await c.query(`set local role authenticated`)
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: '00000000-0000-4000-8000-0000deadbeef', role: 'authenticated' }),
    ])
    if (!victima) escrituraBloqueada = true
    else {
      try {
        await c.query(`update public.ingresos set monto = monto where user_id = $1`, [victima]).then((r) => {
          escrituraBloqueada = r.rowCount === 0
        })
      } catch {
        escrituraBloqueada = true
      }
    }
  } finally {
    await c.query('rollback')
  }
  check('Usuario ajeno no puede modificar datos de otro', escrituraBloqueada)

  await c.end()

  for (const r of resultados) console.log(`${r.ok ? 'PASA ' : 'FALLA'}  ${r.nombre}${!r.ok && r.detalle ? `\n       -> ${r.detalle}` : ''}`)
  const fallas = resultados.filter((r) => !r.ok).length
  console.log(`\n${resultados.length - fallas}/${resultados.length} controles aprobados`)
  process.exit(fallas ? 1 : 0)
}

main().catch((e) => {
  console.error('ERROR', e.message)
  process.exit(2)
})
