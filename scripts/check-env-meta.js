const fs = require("fs");

function strip(v) {
  const t = v.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function check(file) {
  if (!fs.existsSync(file)) {
    console.log(file + ": missing");
    return;
  }
  const t = fs.readFileSync(file, "utf8");
  console.log("--- " + file + " ---");
  const keys = [
    "DISABLE_AUTH",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];
  for (const k of keys) {
    const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
    if (!m) {
      console.log(k + ": MISSING");
      continue;
    }
    const v = strip(m[1]);
    const info = {
      len: v.length,
      empty: v.length === 0,
      sensitivePlaceholder: v.includes("[SENSITIVE]"),
      prefix: v.slice(0, 8),
    };
    if (k === "DISABLE_AUTH") info.value = v;
    console.log(k + ": " + JSON.stringify(info));
  }
}

check(".env.vercel.check");
check(".env.local");
