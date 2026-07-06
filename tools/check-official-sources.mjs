import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "data", "source-registry.json");
const requestWatchlistPath = path.join(root, "data", "request-watchlist.json");
const outDir = path.join(root, "data", "source-checks");
const historyDir = path.join(outDir, "history");
const manifestPath = path.join(outDir, "manifest.json");
const userAgent = "DropRadarPrototype/0.1 local official source check";
const demandRules = {
  minCandidateVotes: 3,
  minSearchCount: 3,
  maxProblemVotes: 0
};

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function safeFileName(value) {
  return String(value || "source").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function htmlText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return String(href || "");
  }
}

function hostnameOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlText(match[1]) : "";
}

function normalizeRequestTerm(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 60);
}

function compactMatchText(value) {
  return String(value || "").toLocaleLowerCase().replace(/\s+/g, "");
}

function requestTokens(term) {
  const clean = normalizeRequestTerm(term);
  const parts = clean
    .split(/[\s,、/／・×xX+＋|｜]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return [...new Set([clean, clean.replace(/\s+/g, ""), ...parts].filter((part) => part.length >= 2))];
}

function requestMatchesText(request, value) {
  const haystack = compactMatchText(value);
  if (!haystack) return false;
  const tokens = requestTokens(request.term);
  const compactTerm = compactMatchText(request.term);
  if (compactTerm && haystack.includes(compactTerm)) return true;
  if (tokens.length >= 2) return tokens.every((token) => haystack.includes(compactMatchText(token)));
  return tokens.some((token) => haystack.includes(compactMatchText(token)));
}

function shouldWatchRequest(request) {
  if (!request || request.hidden || request.status === "rejected") return false;
  if ((Number(request.problemVotes) || 0) > demandRules.maxProblemVotes) return false;
  return request.status === "approved"
    || request.officialUrl
    || (Number(request.candidateVotes) || 0) >= demandRules.minCandidateVotes
    || (Number(request.count) || 0) >= demandRules.minSearchCount;
}

function normalizeRequest(item) {
  const term = normalizeRequestTerm(item?.term || item?.keyword || item?.title);
  if (!term) return null;
  return {
    term,
    status: ["pending", "approved", "rejected"].includes(item?.status) ? item.status : "pending",
    count: Math.max(1, Math.round(Number(item?.count) || 1)),
    candidateVotes: Math.max(0, Math.round(Number(item?.candidateVotes) || 0)),
    problemVotes: Math.max(0, Math.round(Number(item?.problemVotes) || 0)),
    hidden: Boolean(item?.hidden),
    officialUrl: String(item?.officialUrl || "").trim()
  };
}

function loadRequestWatchlist() {
  const raw = readJson(requestWatchlistPath, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeRequest).filter(Boolean).filter(shouldWatchRequest);
}

function requestAppliesToUrl(request, url) {
  if (!request.officialUrl) return true;
  const requestHost = hostnameOf(request.officialUrl);
  const urlHost = hostnameOf(url);
  return !requestHost || !urlHost || requestHost === urlHost || requestHost.endsWith(`.${urlHost}`) || urlHost.endsWith(`.${requestHost}`);
}

function extractLinks(html, baseUrl, source, watchRequests) {
  const host = hostnameOf(baseUrl);
  const keywords = [
    ...(Array.isArray(source.discoveryKeywordsJa) ? source.discoveryKeywordsJa : []),
    ...(Array.isArray(source.discoveryKeywordsEn) ? source.discoveryKeywordsEn : []),
    ...(Array.isArray(source.fieldsJa) ? source.fieldsJa : []),
    ...(Array.isArray(source.fieldsEn) ? source.fieldsEn : [])
  ].map((item) => String(item).toLowerCase()).filter(Boolean);
  const matches = [...String(html || "").matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const links = [];
  const seen = new Set();
  const urlRequests = watchRequests.filter((request) => requestAppliesToUrl(request, baseUrl));
  for (const match of matches) {
    const url = absoluteUrl(baseUrl, match[1]);
    const text = htmlText(match[2]);
    if (!url || seen.has(url)) continue;
    const linkHost = hostnameOf(url);
    if (linkHost && host && linkHost !== host && !linkHost.endsWith(`.${host}`) && !host.endsWith(`.${linkHost}`)) continue;
    const haystack = `${url} ${text}`.toLowerCase();
    const keywordHit = !keywords.length || keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    const usefulPath = /(news|campaign|products?|goods|event|fair|book|item|schedule|calendar|collab|cp|info|release|kuji|prize)/i.test(url);
    const matchedRequests = urlRequests.filter((request) => requestMatchesText(request, `${url} ${text}`));
    if (!keywordHit && !usefulPath && !matchedRequests.length) continue;
    seen.add(url);
    links.push({
      text,
      url,
      sourceUrl: baseUrl,
      matchedRequests: matchedRequests.map((request) => ({
        term: request.term,
        status: request.status,
        count: request.count,
        candidateVotes: request.candidateVotes,
        officialUrl: request.officialUrl
      }))
    });
    if (links.length >= 80) break;
  }
  return links;
}

function linkKey(link) {
  return String(link?.url || "");
}

async function fetchSourceUrl(source, url, watchRequests) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    redirect: "follow"
  });
  const html = await response.text();
  return {
    sourceUrl: url,
    statusCode: response.status,
    ok: response.ok,
    title: extractTitle(html),
    contentSha256: sha256(html),
    candidateLinks: extractLinks(html, url, source, watchRequests)
  };
}

function sourceRequestMatches(source, pages, candidateLinks, watchRequests) {
  const sourceText = [
    source.id,
    source.titleJa,
    source.titleEn,
    source.sourceJa,
    source.sourceEn,
    ...(Array.isArray(source.discoveryKeywordsJa) ? source.discoveryKeywordsJa : []),
    ...(Array.isArray(source.discoveryKeywordsEn) ? source.discoveryKeywordsEn : []),
    ...pages.map((page) => `${page.sourceUrl} ${page.title}`),
    ...candidateLinks.map((link) => `${link.url} ${link.text}`)
  ].filter(Boolean).join(" ");
  const byTerm = new Map();
  for (const request of watchRequests) {
    if (request.officialUrl && !pages.some((page) => requestAppliesToUrl(request, page.sourceUrl))) continue;
    const linkHit = candidateLinks.find((link) => Array.isArray(link.matchedRequests) && link.matchedRequests.some((match) => match.term === request.term));
    const sourceHit = requestMatchesText(request, sourceText);
    if (!linkHit && !sourceHit) continue;
    byTerm.set(request.term, {
      term: request.term,
      status: request.status,
      count: request.count,
      candidateVotes: request.candidateVotes,
      officialUrl: request.officialUrl,
      sourceUrl: linkHit?.sourceUrl || source.officialUrl || source.url || pages[0]?.sourceUrl || "",
      candidateUrl: request.officialUrl || linkHit?.url || source.officialUrl || source.url || pages[0]?.sourceUrl || "",
      linkText: linkHit?.text || "",
      matchType: linkHit ? "link" : "source"
    });
  }
  return [...byTerm.values()];
}

async function checkSource(source, watchRequests) {
  const watchUrls = Array.isArray(source.watchUrls) && source.watchUrls.length
    ? source.watchUrls
    : [source.officialUrl || source.url].filter(Boolean);
  const fileBase = safeFileName(source.id);
  const outPath = path.join(outDir, `${fileBase}.json`);
  const diffPath = path.join(outDir, `${fileBase}-diff.json`);
  const previous = readJson(outPath, null);
  const checkedAt = new Date().toISOString();
  const pages = [];
  const errors = [];
  for (const url of watchUrls) {
    try {
      pages.push(await fetchSourceUrl(source, url, watchRequests));
    } catch (error) {
      errors.push({ sourceUrl: url, message: error.message });
    }
  }
  const candidateLinks = pages.flatMap((page) => page.candidateLinks);
  const requestMatches = sourceRequestMatches(source, pages, candidateLinks, watchRequests);
  const stableContent = [
    source.id,
    ...pages.map((page) => `${page.sourceUrl}|${page.statusCode}|${page.title}|${page.contentSha256}`),
    ...candidateLinks.map((link) => `${link.url}|${link.text}`)
  ].join("\n");
  const result = {
    sourceId: source.id,
    checkedAt,
    sourceUrl: source.officialUrl || source.url || watchUrls[0] || "",
    watchUrls,
    statusCode: errors.length ? "partial" : 200,
    pageCount: pages.length,
    errors,
    title: pages.map((page) => page.title).filter(Boolean)[0] || source.titleJa || source.id,
    contentSha256: sha256(stableContent),
    candidateLinks,
    requestMatches,
    note: "Local official source check. Human review is required before publishing. Respect each site's terms and robots policy before scheduling."
  };

  const previousLinks = Array.isArray(previous?.candidateLinks) ? previous.candidateLinks : [];
  const previousUrls = new Set(previousLinks.map(linkKey).filter(Boolean));
  const currentUrls = new Set(candidateLinks.map(linkKey).filter(Boolean));
  const firstRun = !previous;
  const addedLinks = firstRun ? [] : candidateLinks.filter((link) => !previousUrls.has(linkKey(link)));
  const removedLinks = firstRun ? [] : previousLinks.filter((link) => !currentUrls.has(linkKey(link)));
  const hashChanged = firstRun ? false : previous.contentSha256 !== result.contentSha256;
  const diff = {
    sourceId: result.sourceId,
    sourceUrl: result.sourceUrl,
    watchUrls,
    checkedAt,
    previousCheckedAt: previous?.checkedAt || null,
    firstRun,
    statusCode: result.statusCode,
    title: result.title,
    previousContentSha256: previous?.contentSha256 || null,
    currentContentSha256: result.contentSha256,
    hashChanged,
    previousLinkCount: previousLinks.length,
    currentLinkCount: candidateLinks.length,
    addedCount: addedLinks.length,
    removedCount: removedLinks.length,
    addedLinks,
    removedLinks,
    requestMatches,
    note: result.note
  };

  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(diffPath, `${JSON.stringify(diff, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(historyDir, `${fileBase}-${checkedAt.replace(/[:.]/g, "-")}.json`), `${JSON.stringify(diff, null, 2)}\n`, "utf8");
  return { sourceId: source.id, path: `${fileBase}-diff.json`, checkedAt, addedCount: addedLinks.length, removedCount: removedLinks.length };
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(historyDir, { recursive: true });

const registry = readJson(registryPath, []);
const watchRequests = loadRequestWatchlist();
const sources = registry.filter((source) => source.mode === "auto" && (source.officialUrl || source.url || source.watchUrls?.length));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;
const sourceIds = process.argv
  .filter((arg) => arg.startsWith("--source="))
  .map((arg) => arg.split("=").slice(1).join("="))
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);
const sourceIdSet = new Set(sourceIds);
const filtered = sourceIds.length ? sources.filter((source) => sourceIdSet.has(source.id)) : sources;
const selected = Number.isFinite(limit) && limit > 0 ? filtered.slice(0, limit) : filtered;
const checked = [];
for (const source of selected) {
  checked.push(await checkSource(source, watchRequests));
}

const existing = readJson(manifestPath, { diffs: [] });
const bySource = new Map((Array.isArray(existing.diffs) ? existing.diffs : []).map((item) => [item.sourceId || item.path, item]));
for (const item of checked) bySource.set(item.sourceId, item);
const manifest = {
  generatedAt: new Date().toISOString(),
  diffs: [...bySource.values()].sort((a, b) => String(a.sourceId || "").localeCompare(String(b.sourceId || "")))
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Checked ${checked.length} official source groups. Manifest: ${path.relative(root, manifestPath)}`);
if (watchRequests.length) console.log(`Demand watchlist: ${watchRequests.length} approved/requested terms`);
