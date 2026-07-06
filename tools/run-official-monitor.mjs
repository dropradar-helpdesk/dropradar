import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const skipRemoteRequests = args.includes("--skip-remote-requests");
const fromSample = args.includes("--from-sample");
const includePending = args.includes("--include-pending");
const dryRun = args.includes("--dry-run");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const sourceArgs = args.filter((arg) => arg.startsWith("--source="));
const tierArg = args.find((arg) => arg.startsWith("--tier=")) || "--tier=high";
const startedAt = new Date().toISOString();
const summaryPath = path.join(root, "data", "source-checks", "last-monitor-run.json");
const planPath = path.join(root, "data", "source-checks", "monitor-plan.json");

function runStep(label, script, stepArgs = []) {
  const command = [script, ...stepArgs].join(" ");
  console.log(`\n[DropRadar monitor] ${label}`);
  console.log(`> node ${command}`);
  const result = spawnSync(process.execPath, [script, ...stepArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

const requestArgs = [];
if (fromSample || skipRemoteRequests) requestArgs.push("--from-sample");
if (includePending) requestArgs.push("--include-pending");

const checkArgs = [];
if (limitArg) checkArgs.push(limitArg);
checkArgs.push(...sourceArgs);

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

try {
  const planArgs = [tierArg];
  if (limitArg) planArgs.push(limitArg);
  planArgs.push(...sourceArgs);
  runStep("build monitor plan", "tools/build-monitor-plan.mjs", planArgs);
  const plan = readJson(planPath, null);
  if (!sourceArgs.length && plan?.selectedSources?.length) {
    checkArgs.push(`--source=${plan.selectedSources.map((source) => source.id).join(",")}`);
  }
  if (dryRun) {
    const summary = {
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "planned",
      tier: tierArg.split("=").slice(1).join("="),
      sourcePlanCount: plan?.selectedCount || 0,
      selectedWatchUrlCount: plan?.selectedWatchUrlCount || 0,
      requestWatchTerms: plan?.requestWatchTerms || 0,
      note: "Dry run only. No official pages were fetched and no public cards were changed."
    };
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    console.log(`\n[DropRadar monitor] dry run complete`);
    console.log(`Summary: ${path.relative(root, summaryPath)}`);
    process.exit(0);
  }
  runStep("sync request watchlist", "tools/sync-request-watchlist.mjs", requestArgs);
  runStep("check official sources", "tools/check-official-sources.mjs", checkArgs);
  runStep("build intake candidates", "tools/build-intake-candidates.mjs");

  const manifest = readJson(path.join(root, "data", "source-checks", "manifest.json"), { diffs: [] });
  const candidates = readJson(path.join(root, "data", "intake-candidates.generated.json"), []);
  const watchlist = readJson(path.join(root, "data", "request-watchlist.json"), []);
  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: "complete",
    tier: tierArg.split("=").slice(1).join("="),
    sourcePlanCount: plan?.selectedCount || 0,
    selectedWatchUrlCount: plan?.selectedWatchUrlCount || 0,
    requestWatchTerms: Array.isArray(watchlist) ? watchlist.length : 0,
    sourceDiffs: Array.isArray(manifest.diffs) ? manifest.diffs.length : 0,
    intakeCandidates: Array.isArray(candidates) ? candidates.length : 0,
    note: "Local monitor run. It writes only source-check files and intake candidates; public cards still require admin review."
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`\n[DropRadar monitor] complete`);
  console.log(`Summary: ${path.relative(root, summaryPath)}`);
} catch (error) {
  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: "failed",
    error: error instanceof Error ? error.message : String(error)
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.error(`\n[DropRadar monitor] failed: ${summary.error}`);
  process.exit(1);
}
