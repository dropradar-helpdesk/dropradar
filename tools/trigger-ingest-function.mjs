import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

class TriggerFailure extends Error {}

function readArg(name, fallback = "") {
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function fail(message) {
  throw new TriggerFailure(message);
}

function parseSourceIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readPlanSourceIds() {
  const explicit = parseSourceIds(readArg("--source", ""));
  if (explicit.length) return explicit;
  if (hasFlag("--all")) return [];

  const planPath = path.join(root, readArg("--plan", "data/source-checks/monitor-plan.json"));
  try {
    const plan = JSON.parse((await fs.readFile(planPath, "utf8")).replace(/^\uFEFF/, ""));
    return Array.isArray(plan.selectedSources)
      ? plan.selectedSources.map((source) => String(source.id || "").trim()).filter(Boolean)
      : [];
  } catch {
    fail(`Monitor plan was not found. Run npm run monitor:plan first or pass --source=source-a,source-b.`);
  }
}

async function readJson(response, label) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    fail(`${label} returned HTTP ${response.status}: ${detail}`);
  }
  return body;
}

async function main() {
  const supabaseUrl = cleanUrl(process.env.DROPRADAR_SUPABASE_URL || process.env.SUPABASE_URL || "");
  const anonKey = String(
    process.env.DROPRADAR_SUPABASE_ANON_KEY ||
    process.env.DROPRADAR_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ""
  );
  const ingestSecret = String(process.env.DROPRADAR_INGEST_SECRET || process.env.INGEST_CRON_SECRET || "");
  const functionName = readArg("--function", "ingest-official-sources");
  const dryRun = hasFlag("--dry-run") || !hasFlag("--write");
  const sourceIds = await readPlanSourceIds();

  if (!supabaseUrl || supabaseUrl.includes("YOUR_PROJECT")) fail("DROPRADAR_SUPABASE_URL is not configured.");
  if (!anonKey || anonKey.includes("YOUR_")) fail("DROPRADAR_SUPABASE_ANON_KEY is not configured.");

  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
  const baseHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json"
  };

  console.log("DropRadar scheduled ingest trigger");
  console.log(`Function: ${functionUrl}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "write"}`);
  console.log(`Sources: ${sourceIds.length ? sourceIds.join(", ") : "all enabled sources"}`);

  const health = await fetch(functionUrl, {
    method: "GET",
    headers: baseHeaders
  });
  const healthJson = await readJson(health, "health check");
  console.log(`Health: ok; serviceRole=${healthJson?.hasServiceRoleKey ? "present" : "missing"}, invokeSecret=${healthJson?.hasIngestSecret ? "present" : "missing"}`);

  const headers = { ...baseHeaders };
  if (ingestSecret) headers["x-ingest-secret"] = ingestSecret;

  const run = await fetch(functionUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ dryRun, sourceIds })
  });
  const runJson = await readJson(run, dryRun ? "dry-run ingest" : "scheduled ingest");

  console.log(`Run: ${runJson?.runId || "unknown"}`);
  console.log(`Checked sources: ${runJson?.sourceCount ?? 0}`);
  console.log(`New intake candidates: ${runJson?.candidateCount ?? 0}`);
  console.log("Public drops were not changed. Admin review is still required.");
}

main().catch((error) => {
  if (error instanceof TriggerFailure) {
    console.error(`DropRadar ingest trigger failed: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
