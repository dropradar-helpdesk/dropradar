import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "data", "source-registry.json");
const outDir = path.join(root, "data", "source-audits");
const outPath = path.join(outDir, "robots-audit.json");
const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function hostOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function parseRobots(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean);
  const groups = [];
  let current = null;
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rest.length) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      current = { agents: [value.toLowerCase()], rules: [] };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    if (key === "disallow" || key === "allow") current.rules.push({ type: key, value });
  }
  const starGroups = groups.filter((group) => group.agents.includes("*"));
  const disallowAll = starGroups.some((group) => group.rules.some((rule) => rule.type === "disallow" && rule.value === "/"));
  return {
    groups: groups.length,
    starGroups: starGroups.length,
    disallowAll,
    disallowCount: starGroups.flatMap((group) => group.rules).filter((rule) => rule.type === "disallow").length
  };
}

const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
const sourceFilter = readArg("--source");
const sources = registry.filter((source) => ["auto", "manual"].includes(source.mode) && (!sourceFilter || source.id === sourceFilter));

const audits = [];
for (const source of sources) {
  const origins = [...new Set((source.watchUrls || [source.officialUrl || source.url]).map(hostOf).filter(Boolean))];
  for (const origin of origins) {
    const robotsUrl = `${origin}/robots.txt`;
    const item = {
      sourceId: source.id,
      sourceTitle: source.titleJa || source.titleEn || source.id,
      origin,
      robotsUrl,
      checkedAt: new Date().toISOString()
    };
    try {
      const response = await fetch(robotsUrl, {
        headers: {
          "User-Agent": "DropRadar/0.1 robots-audit; contact=dropradar.helpdesk@gmail.com"
        }
      });
      const text = await response.text();
      const contentType = response.headers.get("content-type") || "";
      Object.assign(item, {
        status: response.status,
        ok: response.ok,
        contentType,
        looksLikeRobots: /user-agent\s*:/i.test(text),
        ...parseRobots(text),
        note: response.ok && /user-agent\s*:/i.test(text)
          ? "robots.txt parsed"
          : response.status === 404
            ? "robots.txt not found; still review site terms before enabling"
            : "robots.txt response was not a standard robots file; review manually"
      });
    } catch (error) {
      Object.assign(item, {
        status: null,
        ok: false,
        looksLikeRobots: false,
        disallowAll: false,
        error: error instanceof Error ? error.message : String(error),
        note: "robots.txt fetch failed; review manually"
      });
    }
    audits.push(item);
  }
}

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(audits, null, 2)}\n`, "utf8");

const blocked = audits.filter((item) => item.disallowAll);
const missing = audits.filter((item) => item.status === 404);
const nonstandard = audits.filter((item) => item.status !== 404 && !item.looksLikeRobots);

console.log(`Wrote ${path.relative(root, outPath)} (${audits.length} hosts)`);
console.log(`disallowAll=${blocked.length}, robots404=${missing.length}, nonstandard=${nonstandard.length}`);
if (sourceFilter) {
  for (const item of audits) {
    console.log(`${item.sourceId} ${item.origin}: status=${item.status} disallowAll=${Boolean(item.disallowAll)} note=${item.note}`);
  }
}
