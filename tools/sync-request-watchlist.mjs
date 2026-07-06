import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appConfigPath = path.join(root, "data", "app-config.json");
const samplePath = path.join(root, "data", "request-watchlist.sample.json");
const outputPath = path.join(root, "data", "request-watchlist.json");
const args = new Set(process.argv.slice(2));

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function normalizeTerm(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function numberArg(name, fallback) {
  const item = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!item) return fallback;
  const value = Number(item.split("=").slice(1).join("="));
  return Number.isFinite(value) ? value : fallback;
}

function normalizeFeedItem(item) {
  const term = normalizeTerm(item?.term);
  if (!term) return null;
  return {
    term,
    status: ["pending", "approved", "rejected", "quarantined"].includes(item?.status) ? item.status : "pending",
    count: Math.max(1, Math.round(Number(item?.search_count ?? item?.count) || 1)),
    candidateVotes: Math.max(0, Math.round(Number(item?.candidate_votes ?? item?.candidateVotes) || 0)),
    problemVotes: Math.max(0, Math.round(Number(item?.problem_votes ?? item?.problemVotes) || 0)),
    hidden: Boolean(item?.hidden),
    officialUrl: String(item?.official_url ?? item?.officialUrl ?? "").trim(),
    lastSeenAt: item?.last_seen_at || item?.lastSeenAt || ""
  };
}

function shouldWatch(item) {
  if (!item || item.hidden || item.status === "rejected" || item.status === "quarantined") return false;
  if (item.problemVotes > 0 && !args.has("--include-problem")) return false;
  if (args.has("--include-pending")) return true;
  const minSearch = numberArg("min-search", 3);
  const minVotes = numberArg("min-votes", 3);
  return item.status === "approved"
    || Boolean(item.officialUrl)
    || item.count >= minSearch
    || item.candidateVotes >= minVotes;
}

async function fetchRemoteFeed() {
  const config = readJson(appConfigPath, null);
  const url = cleanUrl(config?.supabase?.url);
  const anonKey = String(config?.supabase?.anonKey || "");
  if (!config?.features?.supabase || !url || !anonKey) {
    throw new Error("Supabase app-config is not ready. Use --from-sample for local-only checks.");
  }
  const limit = numberArg("limit", 200);
  const endpoint = `${url}/rest/v1/tracking_request_feed?select=*&order=last_seen_at.desc&limit=${limit}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`tracking_request_feed read failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

const raw = args.has("--from-sample") || args.has("--local-only")
  ? readJson(samplePath, [])
  : await fetchRemoteFeed();

const watchlist = (Array.isArray(raw) ? raw : [])
  .map(normalizeFeedItem)
  .filter(Boolean)
  .filter(shouldWatch)
  .sort((a, b) => {
    const demandA = a.candidateVotes * 10 + a.count;
    const demandB = b.candidateVotes * 10 + b.count;
    return demandB - demandA || String(b.lastSeenAt).localeCompare(String(a.lastSeenAt));
  });

fs.writeFileSync(outputPath, `${JSON.stringify(watchlist, null, 2)}\n`, "utf8");
console.log(`Wrote ${watchlist.length} request watch terms to ${path.relative(root, outputPath)}`);
if (!watchlist.length) {
  console.log("No terms passed the demand gate. Use --include-pending only for debugging, not normal monitoring.");
}
