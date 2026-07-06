import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "data", "source-registry.json");
const outputPath = path.join(root, "supabase", "official-sources.generated.sql");

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlArray(values) {
  const clean = [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))];
  if (!clean.length) return "array[]::text[]";
  return `array[${clean.map(sql).join(",")}]`;
}

function keywordList(source) {
  return [
    ...(source.discoveryKeywordsJa || []),
    ...(source.discoveryKeywordsEn || [])
  ];
}

function categoryFor(source) {
  if (source.id.includes("pokemon-card")) return "tcg";
  if (source.id.includes("pokemon-goods")) return "pokemon_goods";
  if (source.id.includes("ichiban-kuji")) return "lottery";
  if (source.id.includes("gashapon")) return "capsule_toy";
  if (source.id.includes("namco") || source.id.includes("gigo") || source.id.includes("taito") || source.id.includes("sega")) return "arcade";
  if (source.id.includes("bandai") || source.id.includes("tamashii")) return "hobby";
  if (source.id.includes("restaurant")) return "restaurant_collab";
  if (source.id.includes("convenience")) return "retail_collab";
  if (source.id.includes("dragonball") || source.id.includes("anime")) return "anime_goods";
  if (source.id.includes("frieren") || source.id.includes("initiald")) return "anime_goods";
  if (source.id.includes("hololive")) return "vtuber_goods";
  if (source.id.includes("square-enix") || source.id.includes("dragonquest") || source.id.includes("capcom")) return "game_goods";
  if (source.id.includes("figure")) return "figure";
  if (source.id.includes("sanrio")) return "character_goods";
  if (source.id.includes("publisher")) return "publisher";
  if (source.id.includes("tourism")) return "tourism";
  return "official";
}

function cadenceFor(source) {
  const priority = source.priority || "";
  if (priority.includes("daily-high")) return "daily_high";
  if (priority.includes("daily-medium")) return "daily";
  if (priority.includes("weekday")) return "weekday";
  if (priority.includes("weekly")) return "weekly";
  return "daily";
}

function modeFor(source) {
  if (source.mode === "auto") return "auto";
  if (source.mode === "manual") return "manual";
  return "disabled";
}

const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
const sources = registry.filter((source) => ["auto", "manual"].includes(source.mode));

const values = sources.map((source) => `  (${[
  sql(source.id),
  sql(source.titleJa || source.titleEn || source.id),
  sql(source.officialUrl || source.url || ""),
  sql(categoryFor(source)),
  sql(modeFor(source)),
  sqlArray(source.watchUrls || [source.officialUrl || source.url]),
  sqlArray(keywordList(source)),
  sql(cadenceFor(source)),
  "null",
  sql(`${source.cautionJa || "Review robots.txt and terms before enabling scheduled checks."} URL/hash diffs only; write original summaries before publishing.`)
].join(", ")})`).join(",\n");
const sourceIds = sources.map((source) => source.id);

const body = `-- Generated from data/source-registry.json.
-- Safe to rerun. Existing robots_checked_at is preserved.

insert into public.official_sources
  (id, name, url, category, check_mode, watch_urls, discovery_keywords, cadence, robots_checked_at, terms_note)
values
${values}
on conflict (id) do update set
  name = excluded.name,
  url = excluded.url,
  category = excluded.category,
  check_mode = excluded.check_mode,
  watch_urls = excluded.watch_urls,
  discovery_keywords = excluded.discovery_keywords,
  cadence = excluded.cadence,
  robots_checked_at = coalesce(public.official_sources.robots_checked_at, excluded.robots_checked_at),
  terms_note = case
    when public.official_sources.robots_checked_at is not null then public.official_sources.terms_note
    else excluded.terms_note
  end,
  updated_at = now();

update public.official_sources
set
  check_mode = 'disabled',
  terms_note = coalesce(terms_note, '') || ' Disabled by source-registry sync because this id is no longer present in data/source-registry.json.',
  updated_at = now()
where id not in (${sourceIds.map(sql).join(", ")});
`;

await fs.writeFile(outputPath, body, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)} (${sources.length} sources)`);
