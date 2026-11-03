const { Client } = require('pg');
(async()=>{
const c=new Client({connectionString:process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/,''),ssl:{rejectUnauthorized:false}});
await c.connect();
const r=await c.query(`select p.proname, pg_get_function_identity_arguments(p.oid) args, t.typname ret, p.prosecdef definer,
 position('auth.uid()' in p.prosrc)>0 uses_uid,
 (select count(*) from pg_policy pol where pg_get_expr(pol.polqual,pol.polrelid) ilike '%'||p.proname||'%' or pg_get_expr(pol.polwithcheck,pol.polrelid) ilike '%'||p.proname||'%') in_policies
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type t on t.oid=p.prorettype
 where n.nspname='public' and (has_function_privilege('anon',p.oid,'EXECUTE') or p.proname='reiniciar_perfil') order by 1`);
console.log(JSON.stringify(r.rows,null,0).replace(/},{/g,'},\n{'));
await c.end();})();
