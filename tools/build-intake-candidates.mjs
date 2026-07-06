import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checksDir = path.join(root, "data", "source-checks");
const registryPath = path.join(root, "data", "source-registry.json");
const outputPath = path.join(root, "data", "intake-candidates.generated.json");
const manifestPath = path.join(checksDir, "manifest.json");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function formatDetectedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function officialTitle(source, lang) {
  if (!source) return lang === "ja" ? "公式ソース" : "Official source";
  return lang === "ja" ? source.titleJa || source.id : source.titleEn || source.titleJa || source.id;
}

function linkUrl(link) {
  if (!link) return "";
  if (typeof link === "string") return link;
  return String(link.url || link.href || "");
}

function linkText(link) {
  if (!link || typeof link === "string") return "";
  return String(link.text || link.title || "");
}

function categoryFor(source) {
  const id = source?.id || "";
  if (id.includes("restaurant")) return ["飲食コラボ", "Restaurant collab"];
  if (id.includes("pokemon")) return ["ポケモン", "Pokemon"];
  if (id.includes("bandai") || id.includes("gashapon")) return ["ホビー/くじ/プライズ", "Hobby / lottery / prize"];
  if (id.includes("publisher")) return ["新刊/原作", "Books / originals"];
  if (id.includes("anime")) return ["アニメ/イベント", "Anime / event"];
  return ["公式差分", "Official diff"];
}

function checklistFor(source, changed) {
  const commonJa = ["公式URLを開く", "日付/締切/購入条件を確認", "画像転載なしで公開できるか確認"];
  const commonEn = ["Open official URL", "Check date, deadline, and purchase rules", "Confirm no image rehosting"];
  if (source?.id === "restaurant-chain-collabs") {
    return {
      checksJa: ["対象店舗を確認", "特典条件/配布終了条件を確認", "公式キャンペーンURLを残す"],
      checksEn: ["Check participating stores", "Check bonus and sellout rules", "Keep official campaign URL"]
    };
  }
  if (source?.id === "convenience-retail-anime-shops") {
    return {
      checksJa: ["店舗差/開始時間を確認", "購入制限を確認", "在庫保証しない表記を確認"],
      checksEn: ["Check store variance and start time", "Check purchase limits", "Confirm no stock guarantee wording"]
    };
  }
  if (!changed) {
    return {
      checksJa: ["監視継続", "差分発生時だけ公開候補化"],
      checksEn: ["Keep watching", "Queue for publishing only when a diff appears"]
    };
  }
  return { checksJa: commonJa, checksEn: commonEn };
}

function candidateFromAddedLink(diff, source, link, index) {
  const url = linkUrl(link);
  const label = linkText(link);
  const [categoryJa, categoryEn] = categoryFor(source);
  const checks = checklistFor(source, true);
  return {
    id: `generated-${diff.sourceId}-${diff.checkedAt || "check"}-${index}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    sourceId: diff.sourceId,
    status: "review",
    titleJa: `${officialTitle(source, "ja")} に新規リンク候補`,
    titleEn: `New link candidate from ${officialTitle(source, "en")}`,
    sourceJa: "公式差分ジョブ",
    sourceEn: "Official diff job",
    reasonJa: `公式ページ差分で新規リンクを検出。公開前に内容、公式性、発売日/締切/購入条件を確認する。${label ? `リンク文言: ${label}` : ""}`,
    reasonEn: `Official page diff detected a new link. Verify content, official status, release/deadline, and purchase conditions before publishing. ${label ? `Link text: ${label}` : ""}`,
    nextJa: "管理確認",
    nextEn: "Admin review",
    detectedAt: formatDetectedAt(diff.checkedAt),
    sourceUrl: diff.sourceUrl || source?.url || source?.officialUrl || "",
    candidateUrl: url,
    officialUrl: url || diff.sourceUrl || source?.officialUrl || source?.url || "",
    categoryJa,
    categoryEn,
    confidence: "要確認",
    fieldsJa: ["公式差分", "新規リンク", "人間確認"],
    fieldsEn: ["Official diff", "New link", "Human review"],
    ...checks
  };
}

function candidateFromRequestMatch(diff, source, match, index) {
  const [categoryJa, categoryEn] = categoryFor(source);
  return {
    id: `demand-${diff.sourceId}-${match.term}-${diff.checkedAt || "check"}-${index}`.replace(/[^a-zA-Z0-9_\-\u3040-\u30ff\u3400-\u9fff]/g, "-"),
    sourceId: diff.sourceId,
    status: "review",
    titleJa: `追跡リクエスト「${match.term}」が公式ソースに一致`,
    titleEn: `Tracking request "${match.term}" matched an official source`,
    sourceJa: "需要センサー + 公式差分ジョブ",
    sourceEn: "Demand sensor + official diff job",
    reasonJa: `承認/一定票数の追跡リクエストが公式ソース内で一致。候補票${match.candidateVotes || 0}、検索${match.count || 0}回。公開前に同名別件ではないか確認する。`,
    reasonEn: `An approved or popular tracking request matched an official source. Votes ${match.candidateVotes || 0}, searches ${match.count || 0}. Confirm this is not a false match before publishing.`,
    nextJa: "管理確認",
    nextEn: "Admin review",
    detectedAt: formatDetectedAt(diff.checkedAt),
    sourceUrl: match.sourceUrl || diff.sourceUrl || source?.url || source?.officialUrl || "",
    candidateUrl: match.candidateUrl || match.officialUrl || diff.sourceUrl || source?.url || source?.officialUrl || "",
    officialUrl: match.officialUrl || match.candidateUrl || source?.officialUrl || source?.url || diff.sourceUrl || "",
    categoryJa: "需要センサー",
    categoryEn: "Demand sensor",
    confidence: match.officialUrl ? "公式URLあり" : `${categoryJa}一致`,
    fieldsJa: ["追跡リクエスト", categoryJa, "即公開しない"],
    fieldsEn: ["Tracking request", categoryEn, "No auto-publish"],
    checksJa: ["公式URLを開く", "同名別件ではないか確認", "発売日/締切/購入条件を確認"],
    checksEn: ["Open official URL", "Check for false positive", "Check date, deadline, and purchase rules"]
  };
}

function heartbeatCandidate(diff, source) {
  const changed = Boolean(diff.hashChanged || diff.addedCount || diff.removedCount);
  const checkedKey = String(diff.checkedAt || "latest").replace(/[^a-zA-Z0-9]/g, "").slice(0, 14) || "latest";
  const [categoryJa, categoryEn] = categoryFor(source);
  const checks = checklistFor(source, changed);
  return {
    id: `generated-${diff.sourceId}-${checkedKey}`,
    sourceId: diff.sourceId,
    status: changed ? "review" : "safe",
    titleJa: `${officialTitle(source, "ja")} 差分チェック済み`,
    titleEn: `${officialTitle(source, "en")} checked`,
    sourceJa: "公式差分ジョブ",
    sourceEn: "Official diff job",
    reasonJa: changed
      ? `ページ差分を検出。追加${diff.addedCount || 0}件、削除${diff.removedCount || 0}件。公開前に管理確認する。`
      : "直近チェックでは新規リンク0件。公式監視は正常に回っているため、次回差分発生時に候補化する。",
    reasonEn: changed
      ? `Page diff detected. Added ${diff.addedCount || 0}, removed ${diff.removedCount || 0}. Admin review required before publishing.`
      : "Latest check found 0 new links. The official watch is running, and future diffs can be queued.",
    nextJa: changed ? "管理確認" : "継続監視",
    nextEn: changed ? "Admin review" : "Keep watching",
    detectedAt: formatDetectedAt(diff.checkedAt),
    sourceUrl: diff.sourceUrl || source?.url || source?.officialUrl || "",
    candidateUrl: diff.sourceUrl || source?.url || source?.officialUrl || "",
    officialUrl: source?.officialUrl || source?.url || diff.sourceUrl || "",
    categoryJa,
    categoryEn,
    confidence: changed ? "要確認" : "高",
    fieldsJa: ["公式URL", changed ? "差分あり" : "差分0件", "画像なし"],
    fieldsEn: ["Official URL", changed ? "Diff found" : "0 diffs", "No images"],
    ...checks
  };
}

const registry = readJson(registryPath, []);
const sources = new Map(registry.map((item) => [item.id, item]));
const manifest = readJson(manifestPath, null);
const files = Array.isArray(manifest?.diffs)
  ? manifest.diffs.map((item) => typeof item === "string" ? item : item?.path).filter(Boolean)
  : fs.existsSync(checksDir)
    ? fs.readdirSync(checksDir).filter((name) => name.endsWith("-diff.json"))
    : [];

const candidates = [];
for (const file of files) {
  const diff = readJson(path.join(checksDir, file), null);
  if (!diff || !diff.sourceId) continue;
  const source = sources.get(diff.sourceId);
  const addedLinks = Array.isArray(diff.addedLinks) ? diff.addedLinks : [];
  const requestMatches = Array.isArray(diff.requestMatches) ? diff.requestMatches : [];
  if (addedLinks.length) {
    addedLinks.forEach((link, index) => candidates.push(candidateFromAddedLink(diff, source, link, index)));
  }
  requestMatches.forEach((match, index) => candidates.push(candidateFromRequestMatch(diff, source, match, index)));
  if (!addedLinks.length && !requestMatches.length) candidates.push(heartbeatCandidate(diff, source));
}

fs.writeFileSync(outputPath, `${JSON.stringify(candidates, null, 2)}\n`, "utf8");
console.log(`Wrote ${candidates.length} intake candidates to ${path.relative(root, outputPath)}`);
