const { Client } = require('pg');
(async()=>{
const c=new Client({connectionString:process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/,''),ssl:{rejectUnauthorized:false}});
await c.connect();
const r=await c.query(`select policyname, cmd, roles::text, qual, with_check from pg_policies where tablename='user_plan_access'`);
console.log(JSON.stringify(r.rows,null,1));
await c.end();})();
