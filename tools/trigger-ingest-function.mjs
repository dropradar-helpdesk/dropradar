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

function cleanOneLine(value, fallback = "") {
  return String(value ?? fallback).replace(/\s+/g, " ").trim();
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

function resultStatus(result = {}) {
  if (result.skipped) return "skipped";
  if (result.status === "partial") return "partial";
  if (result.status === "failed") return "failed";
  return "ok";
}

function resultErrorCount(result = {}) {
  return Array.isArray(result.errors) ? result.errors.length : 0;
}

function summarizeResults(results = []) {
  const summary = {
    total: results.length,
    ok: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
    errorCount: 0
  };
  for (const result of results) {
    const status = resultStatus(result);
    summary[status] += 1;
    summary.errorCount += resultErrorCount(result);
  }
  summary.successful = summary.ok + summary.partial;
  return summary;
}

function compactResult(result = {}) {
  return {
    sourceId: String(result.sourceId || "unknown"),
    status: resultStatus(result),
    watchUrls: Number(result.watchUrls || 0),
    currentLinks: Number(result.currentLinks || 0),
    addedLinks: Number(result.addedLinks || 0),
    removedLinks: Number(result.removedLinks || 0),
    firstRun: Boolean(result.firstRun),
    skipped: Boolean(result.skipped),
    reason: result.reason || "",
    errorCount: resultErrorCount(result),
    errors: Array.isArray(result.errors)
      ? result.errors.slice(0, 5).map((error) => ({
        sourceUrl: error.source_url || error.sourceUrl || "",
        error: cleanOneLine(error.error || error.message || "")
      }))
      : []
  };
}

function buildReport({
  functionName,
  functionUrl,
  dryRun,
  sourceIds,
  healthJson,
  runJson,
  errorMessage = ""
}) {
  const results = Array.isArray(runJson?.results) ? runJson.results.map(compactResult) : [];
  const summary = summarizeResults(results);
  const returnedSourceIds = new Set(results.map((result) => result.sourceId).filter(Boolean));
  const missingSourceIds = sourceIds.filter((sourceId) => !returnedSourceIds.has(sourceId));
  const fatal = [];
  const warnings = [];

  if (errorMessage) fatal.push(errorMessage);
  if (!runJson?.runId && !errorMessage) fatal.push("Ingest function did not return a runId.");
  if (!errorMessage && Number(runJson?.sourceCount || 0) < 1) fatal.push("No official sources were checked.");
  if (!errorMessage && summary.total > 0 && summary.successful < 1) fatal.push("All official-source checks failed or were skipped.");
  if (!errorMessage && missingSourceIds.length) {
    warnings.push(`Requested source IDs were not checked by Supabase: ${missingSourceIds.join(", ")}`);
  }
  if (summary.partial > 0) warnings.push(`${summary.partial} source check(s) were partial.`);
  if (summary.failed > 0) warnings.push(`${summary.failed} source check(s) failed.`);
  if (summary.skipped > 0) warnings.push(`${summary.skipped} source check(s) were skipped.`);
  if (healthJson && healthJson.hasIngestSecret === false) {
    warnings.push("INGEST_CRON_SECRET is not set on the Edge Function; scheduled invokes are less protected.");
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    functionName,
    functionUrl,
    mode: dryRun ? "dry-run" : "write",
    sourceIds,
    health: healthJson ? {
      ok: Boolean(healthJson.ok),
      hasServiceRoleKey: Boolean(healthJson.hasServiceRoleKey),
      hasIngestSecret: Boolean(healthJson.hasIngestSecret)
    } : null,
    run: runJson ? {
      id: runJson.runId || "",
      dryRun: Boolean(runJson.dryRun),
      sourceCount: Number(runJson.sourceCount || 0),
      candidateCount: Number(runJson.candidateCount || 0)
    } : null,
    summary,
    missingSourceIds,
    results,
    warnings,
    fatal
  };
}

function reportMarkdown(report) {
  const run = report.run || {};
  const lines = [
    "## DropRadar daily ingest",
    "",
    `- Mode: ${report.mode}`,
    `- Run ID: ${run.id || "not created"}`,
    `- Sources: ${run.sourceCount ?? 0} checked / requested ${report.sourceIds.length || "all"} / ok ${report.summary.ok} / partial ${report.summary.partial} / failed ${report.summary.failed} / skipped ${report.summary.skipped}`,
    `- New intake candidates: ${run.candidateCount ?? 0}`,
    "- Public drops: unchanged; admin review is still required.",
    ""
  ];

  if (report.fatal.length) {
    lines.push("### Fatal");
    report.fatal.forEach((message) => lines.push(`- ${message}`));
    lines.push("");
  }
  if (report.warnings.length) {
    lines.push("### Warnings");
    report.warnings.forEach((message) => lines.push(`- ${message}`));
    lines.push("");
  }

  if (report.results.length) {
    lines.push("### Source results");
    lines.push("| Source | Status | Added | Removed | Links | Errors |");
    lines.push("|---|---:|---:|---:|---:|---:|");
    for (const result of report.results) {
      lines.push(`| ${result.sourceId} | ${result.status} | ${result.addedLinks} | ${result.removedLinks} | ${result.currentLinks} | ${result.errorCount} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function githubAnnotation(level, message) {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  const clean = cleanOneLine(message).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  console.log(`::${level}::${clean}`);
}

async function publishReport(report, reportPath) {
  const markdown = reportMarkdown(report);
  if (reportPath) {
    const absolutePath = path.resolve(root, reportPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Report: ${path.relative(root, absolutePath)}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  }
  report.warnings.forEach((message) => githubAnnotation("warning", message));
  report.fatal.forEach((message) => githubAnnotation("error", message));
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
  const reportPath = readArg("--report", process.env.DROPRADAR_INGEST_REPORT || "");
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
  const report = buildReport({ functionName, functionUrl, dryRun, sourceIds, healthJson, runJson });
  await publishReport(report, reportPath);

  console.log(`Run: ${runJson?.runId || "unknown"}`);
  console.log(`Checked sources: ${runJson?.sourceCount ?? 0}`);
  console.log(`New intake candidates: ${runJson?.candidateCount ?? 0}`);
  console.log("Public drops were not changed. Admin review is still required.");
  if (report.fatal.length) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  try {
    const supabaseUrl = cleanUrl(process.env.DROPRADAR_SUPABASE_URL || process.env.SUPABASE_URL || "");
    const functionName = readArg("--function", "ingest-official-sources");
    const dryRun = hasFlag("--dry-run") || !hasFlag("--write");
    const reportPath = readArg("--report", process.env.DROPRADAR_INGEST_REPORT || "");
    const sourceIds = parseSourceIds(readArg("--source", ""));
    const report = buildReport({
      functionName,
      functionUrl: supabaseUrl ? `${supabaseUrl}/functions/v1/${functionName}` : "",
      dryRun,
      sourceIds,
      healthJson: null,
      runJson: null,
      errorMessage: message
    });
    await publishReport(report, reportPath);
  } catch (reportError) {
    console.error(`Could not write ingest report: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
  }
  if (error instanceof TriggerFailure) {
    console.error(`DropRadar ingest trigger failed: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
