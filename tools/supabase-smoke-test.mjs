import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "data", "app-config.json");
const args = new Set(process.argv.slice(2));
const writeMode = args.has("--write") || args.has("--admin");
const adminMode = args.has("--admin");

function fail(message) {
  console.error(`Supabase smoke test failed: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

async function readConfig() {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    fail("data/app-config.json was not found. Copy data/app-config.sample.json first.");
  }
}

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function assertRealConfig(config) {
  const url = cleanUrl(config?.supabase?.url);
  const anonKey = String(config?.supabase?.anonKey || "");
  if (!config?.features?.supabase) fail("features.supabase must be true.");
  if (!url || url.includes("YOUR_PROJECT")) fail("supabase.url is not configured.");
  if (!anonKey || anonKey.includes("YOUR_")) fail("supabase.anonKey is not configured.");
  return { url, anonKey, adminAccessToken: String(config?.supabase?.adminAccessToken || "") };
}

function headers(keys, token = "") {
  return {
    apikey: keys.anonKey,
    Authorization: `Bearer ${token || keys.anonKey}`,
    "Content-Type": "application/json"
  };
}

async function readJson(response, label) {
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    const detail = typeof json === "string" ? json : JSON.stringify(json);
    fail(`${label} returned HTTP ${response.status}: ${detail}`);
  }
  return json;
}

async function rest(keys, table, query) {
  const response = await fetch(`${keys.url}/rest/v1/${table}?${query}`, {
    headers: headers(keys)
  });
  return readJson(response, `${table} read`);
}

async function rpc(keys, name, body, token = "") {
  const response = await fetch(`${keys.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers(keys, token),
    body: JSON.stringify(body)
  });
  return readJson(response, `${name} RPC`);
}

function firstRow(value) {
  return Array.isArray(value) ? value[0] : value;
}

const config = await readConfig();
const keys = assertRealConfig(config);

console.log("DropRadar Supabase smoke test");
console.log(`Project: ${keys.url}`);

const sources = await rest(keys, "official_sources", "select=id,name&limit=3");
ok(`official_sources readable (${Array.isArray(sources) ? sources.length : 0} rows)`);

const drops = await rest(keys, "drops", "select=id,title_ja&published_at=not.is.null&limit=3");
if (!Array.isArray(drops) || !drops.length) {
  fail("drops has no published rows. Run npm run drops:sql, then apply supabase/drops.generated.sql.");
}
ok(`drops readable (${Array.isArray(drops) ? drops.length : 0} rows)`);

const feedBefore = await rest(keys, "tracking_request_feed", "select=id,term,search_count,candidate_votes,problem_votes&limit=5");
ok(`tracking_request_feed readable (${Array.isArray(feedBefore) ? feedBefore.length : 0} rows)`);

if (!writeMode) {
  console.log("Read-only smoke test complete. Use --write to submit one test request.");
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const deviceKey = `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const term = `DropRadar smoke ${today}`;

const submitted = firstRow(await rpc(keys, "submit_tracking_request", {
  p_term: term,
  p_device_key: deviceKey
}));

if (!submitted?.id) fail("submit_tracking_request did not return an id.");
ok(`submit_tracking_request wrote "${submitted.term}"`);

const voted = firstRow(await rpc(keys, "vote_tracking_request", {
  p_request_id: submitted.id,
  p_vote_type: "candidate",
  p_device_key: deviceKey
}));

if (!voted?.candidate_votes && voted?.candidate_votes !== 0) fail("vote_tracking_request did not return candidate_votes.");
ok(`vote_tracking_request returned candidate_votes=${voted.candidate_votes}`);

const feedAfter = await rest(keys, "tracking_request_feed", `select=id,term,search_count,candidate_votes,problem_votes&id=eq.${submitted.id}`);
if (!Array.isArray(feedAfter) || !feedAfter.length) fail("written request is not visible in tracking_request_feed.");
ok("written request is visible in tracking_request_feed");

if (!adminMode) {
  console.log("Write smoke test complete. Use --admin to also test admin_set_tracking_request.");
  process.exit(0);
}

const adminToken = keys.adminAccessToken;
if (!adminToken || adminToken.includes("YOUR_")) {
  fail("supabase.adminAccessToken is required for --admin.");
}

const adminResult = await rpc(keys, "admin_set_tracking_request", {
  p_request_id: submitted.id,
  p_status: "rejected",
  p_hidden: true,
  p_official_url: "",
  p_admin_note: "DropRadar smoke admin cleanup",
  p_merged_into_id: null
}, adminToken);

if (!adminResult?.id) fail("admin_set_tracking_request did not return the updated row.");
ok("admin_set_tracking_request updated the smoke request");
console.log("Admin smoke test complete.");
