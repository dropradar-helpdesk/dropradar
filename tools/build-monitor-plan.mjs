import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "data", "source-registry.json");
const requestWatchlistPath = path.join(root, "data", "request-watchlist.json");
const outDir = path.join(root, "data", "source-checks");
const outputPath = path.join(outDir, "monitor-plan.json");
const args = process.argv.slice(2);

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function readArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function numberArg(name, fallback = 0) {
  const value = Number(readArg(name, fallback ? String(fallback) : ""));
  return Number.isFinite(value) ? value : fallback;
}

function watchUrlCount(source) {
  return Array.isArray(source.watchUrls) && source.watchUrls.length
    ? source.watchUrls.length
    : source.officialUrl || source.url ? 1 : 0;
}

function tierMatches(source, tier) {
  if (tier === "all") return true;
  if (tier === "high") return source.priority === "daily-high";
  if (tier === "medium") return source.priority === "daily-medium";
  if (tier === "weekday") return source.priority === "weekday";
  if (tier === "support") return source.priority === "weekly-support";
  return source.priority === "daily-high";
}

function sourceWeight(source) {
  const weights = {
    "daily-high": 0,
    "daily-medium": 1,
    weekday: 2,
    "weekly-support": 3,
    "later-moderated": 4
  };
  return weights[source.priority] ?? 9;
}

function commandForSources(sourceIds, options = {}) {
  const args = [
    "npm run monitor:run --",
    options.fromSample ? "--from-sample" : "",
    options.tier ? `--tier=${options.tier}` : "",
    sourceIds.length ? `--source=${sourceIds.join(",")}` : ""
  ].filter(Boolean);
  return args.join(" ");
}

const tier = readArg("tier", "high");
const dryRun = args.includes("--dry-run");
const sourceIds = args
  .filter((arg) => arg.startsWith("--source="))
  .map((arg) => arg.split("=").slice(1).join("="))
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);
const sourceIdSet = new Set(sourceIds);
const limit = numberArg("limit", tier === "high" ? 8 : 0);
const registry = readJson(registryPath, []);
const watchlist = readJson(requestWatchlistPath, []);
const autoSources = registry
  .filter((source) => source.mode === "auto" && watchUrlCount(source) > 0)
  .filter((source) => sourceIds.length ? sourceIdSet.has(source.id) : tierMatches(source, tier))
  .sort((a, b) => sourceWeight(a) - sourceWeight(b) || String(a.id).localeCompare(String(b.id)));
const selected = limit > 0 ? autoSources.slice(0, limit) : autoSources;
const byPriority = registry.reduce((acc, source) => {
  const key = source.priority || "unknown";
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
const plan = {
  generatedAt: new Date().toISOString(),
  tier,
  dryRun,
  selectedCount: selected.length,
  selectedWatchUrlCount: selected.reduce((sum, source) => sum + watchUrlCount(source), 0),
  requestWatchTerms: Array.isArray(watchlist) ? watchlist.length : 0,
  byPriority,
  selectedSources: selected.map((source) => ({
    id: source.id,
    titleJa: source.titleJa || source.id,
    titleEn: source.titleEn || source.titleJa || source.id,
    priority: source.priority || "",
    watchUrlCount: watchUrlCount(source),
    officialUrl: source.officialUrl || source.url || "",
    cadenceJa: source.cadenceJa || "",
    cadenceEn: source.cadenceEn || ""
  })),
  commands: {
    dryRun: `npm run monitor:plan -- --tier=${tier} --dry-run`,
    localSample: commandForSources(selected.map((source) => source.id), { fromSample: true, tier }),
    production: commandForSources(selected.map((source) => source.id), { tier })
  },
  note: "Monitor plan only. It does not publish cards. Official links still enter intake and require admin verification."
};

fs.mkdirSync(outDir, { recursive: true });
if (!dryRun) fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

console.log(`${dryRun ? "Planned" : "Wrote"} ${selected.length} source groups for tier=${tier}`);
console.log(`Watch URLs: ${plan.selectedWatchUrlCount}`);
console.log(`Output: ${path.relative(root, outputPath)}`);
