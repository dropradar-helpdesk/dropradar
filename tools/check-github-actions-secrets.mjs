import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowPath = path.join(root, ".github", "workflows", "dropradar-daily-ingest.yml");
const planPath = path.join(root, "data", "source-checks", "monitor-plan.json");
const requiredSecrets = [
  "DROPRADAR_SUPABASE_URL",
  "DROPRADAR_SUPABASE_ANON_KEY",
  "DROPRADAR_INGEST_SECRET"
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return fallback;
  }
}

function mask(value) {
  const text = String(value || "");
  if (!text) return "missing";
  if (text.length <= 10) return "***";
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

const workflow = readText(workflowPath);
const plan = readJson(planPath, null);
const missingFromWorkflow = requiredSecrets.filter((name) => !workflow.includes(`secrets.${name}`));
const missingFromEnv = requiredSecrets.filter((name) => !process.env[name]);
const selectedSources = Array.isArray(plan?.selectedSources) ? plan.selectedSources : [];

console.log("DropRadar GitHub Actions preflight");
console.log(`Workflow: ${path.relative(root, workflowPath)}`);
console.log(`Daily cron: ${workflow.includes("17 22 * * *") ? "07:17 JST configured" : "not found"}`);
console.log(`Plan sources: ${selectedSources.length}`);
console.log(`Watch URLs: ${plan?.selectedWatchUrlCount ?? "unknown"}`);

for (const source of selectedSources) {
  console.log(`- ${source.id} (${source.watchUrlCount || 0} urls)`);
}

for (const name of requiredSecrets) {
  console.log(`${name}: ${mask(process.env[name])}`);
}

if (missingFromWorkflow.length) {
  console.error(`Workflow does not reference: ${missingFromWorkflow.join(", ")}`);
  process.exitCode = 1;
}

if (missingFromEnv.length) {
  console.log(`Local environment is missing: ${missingFromEnv.join(", ")}`);
  console.log("This is OK before GitHub setup. Add them as GitHub repository secrets before enabling the scheduled run.");
}

if (plan?.tier !== "all" || selectedSources.length < 1) {
  console.error("Expected an all-source daily monitor plan. Run npm run monitor:plan -- --tier=all.");
  process.exitCode = 1;
}

if (!workflow.includes("--tier=all")) {
  console.error("Workflow should build the daily all-source plan with --tier=all.");
  process.exitCode = 1;
}

if (!workflow.includes("workflow_dispatch")) {
  console.error("Manual workflow_dispatch trigger is missing.");
  process.exitCode = 1;
}

if (process.exitCode) {
  console.error("Preflight completed with issues.");
} else {
  console.log("Preflight OK.");
}
