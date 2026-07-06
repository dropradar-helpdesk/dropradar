import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "data", "app-config.json");
const args = process.argv.slice(2);

class SmokeFailure extends Error {}

function readArg(name, fallback = "") {
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function fail(message) {
  throw new SmokeFailure(message);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

async function readConfig() {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    fail("data/app-config.json was not found. Copy data/app-config.sample.json first.");
  }
}

function assertConfig(config) {
  const url = cleanUrl(config?.supabase?.url);
  const anonKey = String(config?.supabase?.anonKey || "");
  if (!config?.features?.supabase) fail("features.supabase must be true.");
  if (!url || url.includes("YOUR_PROJECT")) fail("supabase.url is not configured.");
  if (!anonKey || anonKey.includes("YOUR_")) fail("supabase.anonKey is not configured.");
  return { url, anonKey };
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
    if (response.status === 401 && label.includes("ingest")) {
      fail(`${label} returned HTTP 401. Set DROPRADAR_INGEST_SECRET in the shell if INGEST_CRON_SECRET is configured.`);
    }
    fail(`${label} returned HTTP ${response.status}: ${detail}`);
  }
  return body;
}

async function main() {
  const config = await readConfig();
  const keys = assertConfig(config);
  const functionName = readArg("--function", "ingest-official-sources");
  const functionUrl = `${keys.url}/functions/v1/${functionName}`;
  const dryRun = !hasFlag("--write");
  const source = readArg("--source", "");
  const secret = process.env.DROPRADAR_INGEST_SECRET || process.env.INGEST_CRON_SECRET || "";

  const baseHeaders = {
    apikey: keys.anonKey,
    Authorization: `Bearer ${keys.anonKey}`,
    "Content-Type": "application/json"
  };

  console.log("DropRadar Edge Function smoke test");
  console.log(`Function: ${functionUrl}`);

  const health = await fetch(functionUrl, {
    method: "GET",
    headers: baseHeaders
  });
  const healthJson = await readJson(health, "health check");
  ok(`health check ok; service role env=${healthJson?.hasServiceRoleKey ? "present" : "missing"}, secret=${healthJson?.hasIngestSecret ? "present" : "missing"}`);

  const postHeaders = { ...baseHeaders };
  if (secret) postHeaders["x-ingest-secret"] = secret;

  const payload = {
    dryRun,
    sourceIds: source ? [source] : []
  };

  const run = await fetch(functionUrl, {
    method: "POST",
    headers: postHeaders,
    body: JSON.stringify(payload)
  });

  const runJson = await readJson(run, dryRun ? "dry-run ingest" : "ingest");
  ok(`${dryRun ? "dry-run" : "ingest"} completed; sources=${runJson?.sourceCount ?? 0}, candidates=${runJson?.candidateCount ?? 0}`);

  if (dryRun) {
    console.log("No source_checks or intake_candidates were written because this was a dry run.");
  } else {
    console.log("Write mode was used. Review source_checks and intake_candidates before publishing anything.");
  }
}

main().catch((error) => {
  if (error instanceof SmokeFailure) {
    console.error(`Edge Function smoke test failed: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
