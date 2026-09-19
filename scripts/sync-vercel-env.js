const fs = require("fs");
const { spawnSync } = require("child_process");

function parseEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1].trim()] = v;
  }
  return out;
}

const env = parseEnv(".env.local");
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const url = env.NEXT_PUBLIC_SUPABASE_URL;

if (!service || !anon || !url) {
  console.error("Missing required keys in .env.local");
  process.exit(1);
}

function upsert(name, value, sensitive = true) {
  console.log(`Setting ${name} (len=${value.length})...`);
  const args = [
    "vercel",
    "env",
    "add",
    name,
    "production,preview",
    "--force",
    "--yes",
    "--value",
    value,
  ];
  if (sensitive) args.push("--sensitive");
  else args.push("--no-sensitive");

  const result = spawnSync("npx", args, { encoding: "utf8", shell: true });
  if (result.status !== 0) {
    console.error((result.stderr || result.stdout || "").slice(0, 800));
    process.exit(result.status || 1);
  }
  console.log(`OK ${name}`);
}

upsert("SUPABASE_SERVICE_ROLE_KEY", service, true);
upsert("SUPABASE_ANON_KEY", anon, true);
upsert("NEXT_PUBLIC_SUPABASE_ANON_KEY", anon, true);
upsert("NEXT_PUBLIC_SUPABASE_URL", url, false);
upsert("SUPABASE_URL", url, false);
upsert("DISABLE_AUTH", "true", false);

console.log("Done. Redeploy required for changes to apply.");
