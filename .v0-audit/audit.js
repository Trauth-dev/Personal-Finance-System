const { Client } = require("/tmp/audit/node_modules/pg")

const queries = {
  tablas: `
    select c.relname as t, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
    order by c.relrowsecurity, c.relname`,
  rls_sin_politicas: `
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity
      and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname)`,
  politicas: `
    select tablename t, policyname p, cmd, roles::text r, qual q, with_check w
    from pg_policies where schemaname='public' order by tablename, cmd`,
  vistas: `
    select c.relname, c.relkind, c.reloptions,
      has_table_privilege('anon', c.oid, 'select') anon_sel,
      has_table_privilege('authenticated', c.oid, 'select') auth_sel
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('v','m')`,
  funciones: `
    select p.proname, p.prosecdef as definer, p.proconfig cfg,
      has_function_privilege('anon', p.oid, 'execute') as anon,
      has_function_privilege('authenticated', p.oid, 'execute') as auth
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname='public' and p.prokind='f' and d.objid is null
    order by p.prosecdef desc, p.proname`,
  storage: `select id, public, file_size_limit, allowed_mime_types from storage.buckets`,
  storage_politicas: `
    select policyname p, cmd, roles::text r, qual q, with_check w
    from pg_policies where schemaname='storage'`,
}

;(async () => {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(/\?.*$/, ""),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query("begin read only")
  const only = process.argv[2]
  const extra = process.argv[3]
  if (only === "sql") {
    const { rows } = await client.query(extra)
    console.log(JSON.stringify(rows, null, 0).replace(/\},\{/g, "},\n{"))
  }
  for (const [nombre, sql] of Object.entries(queries)) {
    if (only && nombre !== only) continue
    try {
      const { rows } = await client.query(sql)
      console.log(`\n=== ${nombre} (${rows.length}) ===`)
      console.log(JSON.stringify(rows, null, 0).replace(/\},\{/g, "},\n{"))
    } catch (e) {
      console.log(`\n=== ${nombre} ERROR: ${e.message}`)
    }
  }
  await client.query("rollback")
  await client.end()
})()
