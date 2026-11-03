const fs = require("fs")
const { Client } = require("/tmp/audit/node_modules/pg")

;(async () => {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(/\?.*$/, ""),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    await client.query(fs.readFileSync(process.argv[2], "utf8"))
    console.log("OK: migración aplicada")
  } catch (e) {
    await client.query("rollback").catch(() => {})
    console.log("ERROR:", e.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
})()
