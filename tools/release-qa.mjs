import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  try {
    return JSON.parse(readText(filePath));
  } catch (error) {
    errors.push(`${rel(filePath)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function requireFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath} is missing`);
    return "";
  }
  return readText(filePath);
}

function checkNoPublicCopyLeaks(files) {
  const banned = [
    "東京サンプル",
    "Tokyo sample",
    "手動サンプル",
    "Manual sample",
    "tier none",
    "mailto:",
    "coming soon",
    "Coming soon",
    "TODO",
    "FIXME"
  ];

  for (const relativePath of files) {
    const body = requireFile(relativePath);
    for (const token of banned) {
      if (body.includes(token)) {
        errors.push(`${relativePath} contains release-blocking copy: ${token}`);
      }
    }
  }
}

function checkScripts(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  if (!scripts.length) {
    errors.push("index.html has no inline app script");
    return;
  }
  scripts.forEach((script, index) => {
    try {
      new Function(script);
    } catch (error) {
      errors.push(`index.html script ${index + 1} is invalid: ${error.message}`);
    }
  });
}

function checkManifest(manifest) {
  if (!manifest) return;
  const required = ["name", "short_name", "start_url", "display", "icons"];
  for (const key of required) {
    if (!manifest[key]) errors.push(`manifest.webmanifest missing ${key}`);
  }
  const iconSizes = new Set((manifest.icons || []).map((icon) => icon.sizes));
  for (const size of ["192x192", "512x512"]) {
    if (!iconSizes.has(size)) errors.push(`manifest.webmanifest missing ${size} icon`);
  }
}

function checkContact(indexHtml, legalHtml, contact) {
  const expectedMail = "dropradar.helpdesk@gmail.com";
  if (!contact || contact.email !== expectedMail) {
    errors.push(`data/contact.json email must be ${expectedMail}`);
  }
  const combined = `${indexHtml}\n${legalHtml}`;
  const gmailCount = (combined.match(/mail\.google\.com\/mail\/\?view=cm/g) || []).length;
  if (gmailCount < 3) {
    errors.push(`expected Gmail compose contact links in index/legal, found ${gmailCount}`);
  }
  for (const phrase of [
    "一般的な使い勝手",
    "個別サポートには原則対応しません",
    "GPSは任意",
    "現在地は悪用・保存・第三者提供しません",
    "当方では責任を負いかねます"
  ]) {
    if (!combined.includes(phrase)) {
      errors.push(`public policy/contact copy missing: ${phrase}`);
    }
  }
}

function checkDrops(drops) {
  if (!Array.isArray(drops) || !drops.length) {
    errors.push("data/drops.json must contain public cards");
    return;
  }
  const seen = new Set();
  const requiredFields = ["id", "titleJa", "titleEn", "source", "method", "link"];
  for (const [index, drop] of drops.entries()) {
    for (const field of requiredFields) {
      if (!drop[field]) errors.push(`data/drops.json[${index}] missing ${field}`);
    }
    if (seen.has(drop.id)) errors.push(`duplicate drop id: ${drop.id}`);
    seen.add(drop.id);
    if (drop.image || drop.imageUrl || drop.thumbnail) {
      errors.push(`drop ${drop.id} appears to rehost an image`);
    }
  }
  const verified = drops.filter((drop) => drop.dateVerified === true).length;
  if (verified === 0) {
    warnings.push("all public cards are unverified/date-unconfirmed watch cards");
  }
}

function checkSources(sources) {
  if (!Array.isArray(sources) || !sources.length) {
    errors.push("data/source-registry.json must contain official source groups");
    return;
  }
  const seen = new Set();
  let autoCount = 0;
  let watchUrlCount = 0;
  for (const [index, source] of sources.entries()) {
    if (!source.id) errors.push(`data/source-registry.json[${index}] missing id`);
    if (seen.has(source.id)) errors.push(`duplicate source id: ${source.id}`);
    seen.add(source.id);
    if (!source.titleJa || !source.titleEn) errors.push(`source ${source.id || index} missing title`);
    const urlRequired = source.mode !== "manual" && source.mode !== "report";
    if (urlRequired && !source.officialUrl && !source.url && !(Array.isArray(source.watchUrls) && source.watchUrls.length)) {
      errors.push(`source ${source.id || index} has no official/watch URL`);
    }
    if (source.mode === "auto") autoCount += 1;
    if (Array.isArray(source.watchUrls)) watchUrlCount += source.watchUrls.length;
  }
  if (autoCount < 1) errors.push("no auto source groups configured");
  if (watchUrlCount < autoCount) warnings.push("some auto sources have no watchUrls");
}

function checkPublicConfig(config) {
  if (!config) return;
  if (config.supabase?.serviceRoleKey || config.serviceRoleKey || config.adminPassword) {
    errors.push("public app config exposes privileged credentials");
  }
  if (config.supabase?.anonKey && !String(config.supabase.anonKey).startsWith("sb_publishable_")) {
    errors.push("public app config Supabase key is not a publishable anon key");
  }
  const forbiddenKeyPattern = /service.*role|admin.*password|database.*password|ingest.*secret/i;
  function walk(value, keyPath = []) {
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = [...keyPath, key];
      if (forbiddenKeyPattern.test(key) && nested) {
        errors.push(`public app config exposes forbidden key: ${nextPath.join(".")}`);
      }
      walk(nested, nextPath);
    }
  }
  walk(config);
}

function checkServiceWorker(sw) {
  const match = sw.match(/CACHE_VERSION\s*=\s*"([^"]+)"/);
  if (!match) errors.push("sw.js missing CACHE_VERSION");
  if (!/dropradar-pwa-v\d+/.test(match?.[1] || "")) {
    errors.push(`sw.js CACHE_VERSION is not versioned: ${match?.[1] || "missing"}`);
  }
  for (const asset of ["index.html", "legal.html", "offline.html", "manifest.webmanifest", "data/drops.json"]) {
    if (!sw.includes(asset)) warnings.push(`sw.js does not reference ${asset}`);
  }
}

const indexHtml = requireFile("index.html");
const legalHtml = requireFile("legal.html");
const sw = requireFile("sw.js");
const manifest = readJson(path.join(root, "manifest.webmanifest"));
const drops = readJson(path.join(root, "data", "drops.json"));
const sources = readJson(path.join(root, "data", "source-registry.json"));
const contact = readJson(path.join(root, "data", "contact.json"));
const publicConfig = readJson(path.join(root, "data", "app-config.public.json"));

checkNoPublicCopyLeaks([
  "index.html",
  "legal.html",
  "offline.html",
  "manifest.webmanifest",
  "data/contact.json",
  "data/app-config.public.json"
]);
checkScripts(indexHtml);
checkManifest(manifest);
checkContact(indexHtml, legalHtml, contact);
checkDrops(drops);
checkSources(sources);
checkPublicConfig(publicConfig);
checkServiceWorker(sw);

console.log("DropRadar release QA");
console.log(`cards: ${Array.isArray(drops) ? drops.length : 0}`);
console.log(`sources: ${Array.isArray(sources) ? sources.length : 0}`);
console.log(`warnings: ${warnings.length}`);
for (const warning of warnings) console.log(`warn: ${warning}`);

if (errors.length) {
  console.error(`errors: ${errors.length}`);
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}

console.log("Release QA OK.");
