-- Enable the 2026-07-07 official source expansion after robots audit.
-- Scope remains URL/hash diff only. Do not copy official images, article text,
-- campaign assets, product descriptions, or map screenshots into public cards.
--
-- Audit evidence: data/source-audits/robots-audit.json
-- Decision log: data/source-audits/source-enablement-decisions.json

update public.official_sources
set
  robots_checked_at = now(),
  terms_note = case id
    when 'square-enix-dragonquest-goods' then 'Enabled 2026-07-07 after robots audit: jp.square-enix.com returned 404; dragonquest.jp parsed with no disallow-all. URL/hash diff only; original summaries and official links only.'
    when 'taito-prize-official' then 'Enabled 2026-07-07 after robots audit: taito.co.jp parsed with no disallow-all. URL/hash diff only; no images, copied descriptions, or stock claims.'
    when 'sega-plaza-prize' then 'Enabled 2026-07-07 after robots audit: segaplaza.jp robots returned 404; no disallow-all observed. URL/hash diff only; original summaries and official links only.'
    when 'sanrio-official-goods' then 'Enabled 2026-07-07 after robots audit: sanrio.co.jp parsed with no disallow-all; shop.sanrio.co.jp returned 404. URL/hash diff only; no character art or product photos.'
    when 'frieren-official' then 'Enabled 2026-07-07 after robots audit: frieren-anime.jp parsed with no disallow-all. URL/hash diff only; no key visuals, screenshots, or copied article text.'
    when 'initiald-official-events' then 'Enabled 2026-07-07 after robots audit: initiald-portal.com robots returned 404; no disallow-all observed. URL/hash diff only; no copied visuals or map screenshots.'
    when 'capcom-store-cafe-amusement' then 'Enabled 2026-07-07 after robots audit: capcom.co.jp returned 404 and capcom-games.com returned 403/nonstandard; no disallow-all observed. URL/hash diff only; original summaries and official links only.'
    else terms_note
  end
where id in (
  'square-enix-dragonquest-goods',
  'taito-prize-official',
  'sega-plaza-prize',
  'sanrio-official-goods',
  'frieren-official',
  'initiald-official-events',
  'capcom-store-cafe-amusement'
);
