import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "data", "drops.json");
const outputPath = path.join(root, "supabase", "drops.generated.sql");

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return "null";
  return sqlString(value);
}

function sqlTextArray(values) {
  const items = Array.isArray(values) ? values : [];
  if (!items.length) return "'{}'::text[]";
  return `array[${items.map(sqlString).join(", ")}]::text[]`;
}

function rowSql(drop) {
  const state = ["soon", "store", "lottery", "online"].includes(drop.state) ? drop.state : "soon";
  const releaseAt = drop.dateVerified === false ? null : drop.date;
  const deadlineAt = drop.deadlineVerified === false ? null : drop.deadline;
  return `(
    ${sqlString(drop.id)},
    ${sqlString(drop.titleJa)},
    ${sqlString(drop.titleEn || drop.titleJa)},
    ${sqlString(drop.brand || "未分類")},
    ${sqlString(drop.category || "未分類")},
    ${sqlString(drop.method || "公式告知")},
    ${sqlString(state)},
    ${sqlString(drop.statusJa || "公式確認")},
    ${sqlString(drop.statusEn || "Official checked")},
    ${sqlString(drop.link)},
    ${sqlString(drop.source || "公式ソース")},
    ${sqlDate(releaseAt)},
    ${sqlDate(deadlineAt)},
    ${sqlString(drop.areaJa)},
    ${sqlString(drop.areaEn || drop.areaJa)},
    ${sqlString(drop.limitJa)},
    ${sqlString(drop.limitEn || drop.limitJa)},
    ${sqlString(drop.howJa)},
    ${sqlString(drop.howEn || drop.howJa)},
    ${sqlTextArray(drop.tags)},
    ${sqlString(drop.icon || "i-ticket")},
    ${sqlString(drop.artA || "#2f8f7f")},
    ${sqlString(drop.artB || "#f2c879")},
    now()
  )`;
}

const drops = JSON.parse(await fs.readFile(inputPath, "utf8").then((raw) => raw.replace(/^\uFEFF/, "")));
if (!Array.isArray(drops)) {
  throw new Error("data/drops.json must be an array.");
}

const seen = new Set();
const validDrops = drops.filter((drop) => {
  if (!drop?.id || !drop?.titleJa || !drop?.link || seen.has(drop.id)) return false;
  seen.add(drop.id);
  return true;
});

const sql = `-- Generated from data/drops.json. Review before running in Supabase SQL Editor.
-- Generated at ${new Date().toISOString()}.

alter table public.drops add column if not exists method text not null default 'official';
alter table public.drops add column if not exists status_ja text;
alter table public.drops add column if not exists status_en text;
alter table public.drops add column if not exists source_label text;
alter table public.drops add column if not exists icon text;
alter table public.drops add column if not exists art_a text;
alter table public.drops add column if not exists art_b text;

insert into public.drops (
  id,
  title_ja,
  title_en,
  brand,
  category,
  method,
  state,
  status_ja,
  status_en,
  official_url,
  source_label,
  release_at,
  deadline_at,
  area_ja,
  area_en,
  purchase_limit_ja,
  purchase_limit_en,
  how_ja,
  how_en,
  tags,
  icon,
  art_a,
  art_b,
  published_at
)
values
${validDrops.map(rowSql).join(",\n")}
on conflict (id) do update set
  title_ja = excluded.title_ja,
  title_en = excluded.title_en,
  brand = excluded.brand,
  category = excluded.category,
  method = excluded.method,
  state = excluded.state,
  status_ja = excluded.status_ja,
  status_en = excluded.status_en,
  official_url = excluded.official_url,
  source_label = excluded.source_label,
  release_at = excluded.release_at,
  deadline_at = excluded.deadline_at,
  area_ja = excluded.area_ja,
  area_en = excluded.area_en,
  purchase_limit_ja = excluded.purchase_limit_ja,
  purchase_limit_en = excluded.purchase_limit_en,
  how_ja = excluded.how_ja,
  how_en = excluded.how_en,
  tags = excluded.tags,
  icon = excluded.icon,
  art_a = excluded.art_a,
  art_b = excluded.art_b,
  published_at = coalesce(public.drops.published_at, excluded.published_at),
  updated_at = now();
`;

await fs.writeFile(outputPath, sql, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)} with ${validDrops.length} drops.`);
