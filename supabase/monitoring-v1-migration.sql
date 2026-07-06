-- DropRadar monitoring v1 migration.
-- Run this on an existing Supabase project before deploying the
-- ingest-official-sources Edge Function v1.

alter table public.official_sources
  add column if not exists watch_urls text[] not null default '{}',
  add column if not exists discovery_keywords text[] not null default '{}';

update public.official_sources
set
  watch_urls = case id
    when 'pokemon-card-tcg' then array['https://www.pokemon-card.com/products/','https://www.pokemon-card.com/info/','https://www.pokemon-card.com/event/']
    when 'pokemon-goods-center' then array['https://www.pokemon.co.jp/goods/','https://www.pokemoncenter-online.com/','https://www.pokemon.co.jp/ex/']
    when 'bandai-hobby-kuji-prize' then array['https://www.bandaispirits.co.jp/products/','https://1kuji.com/','https://bsp-prize.jp/','https://tamashiiweb.com/','https://bandai-hobby.net/']
    when 'dragonball-official' then array['https://dragon-ball-official.com/news/','https://p-bandai.jp/chara/c0009/','https://www.carddass.com/dbh/']
    when 'hololive-official' then array['https://hololive.hololivepro.com/news/','https://shop.hololivepro.com/','https://hololive.hololivepro.com/events/']
    when 'figure-makers-preorder' then array['https://www.goodsmile.info/','https://www.kotobukiya.co.jp/product/','https://alter-web.jp/','https://www.megahobby.jp/']
    when 'gashapon-prize-arcade' then array['https://www.gashapon.jp/','https://bsp-prize.jp/','https://tempo.gendagigo.jp/cp/','https://bandainamco-am.co.jp/']
    when 'restaurant-chain-collabs' then array['https://www.mcdonalds.co.jp/campaign/','https://www.yoshinoya.com/campaign/','https://www.sukiya.jp/news/','https://www.ichibanya.co.jp/cp/','https://www.skylark.co.jp/campaign/']
    when 'convenience-retail-anime-shops' then array['https://www.family.co.jp/campaign.html','https://www.lawson.co.jp/lab/campaign/','https://www.sej.co.jp/cmp/','https://www.animate.co.jp/fair_event/','https://tower.jp/']
    when 'publishers-shueisha-jump' then array['https://www.shueisha.co.jp/books/','https://www.shonenjump.com/j/','https://manga-plus.shueisha.co.jp/updates']
    when 'publishers-kodansha-shogakukan' then array['https://kc.kodansha.co.jp/','https://shogakukan-comic.jp/book','https://www.sunday-webry.com/']
    when 'anime-adaptation-events' then array['https://frieren-anime.jp/','https://www.aniplex.co.jp/','https://www.tohoanimation.jp/']
    when 'local-tourism-pilgrimage' then array['https://initiald-portal.com/','https://animetourism88.com/','https://www.mlit.go.jp/']
    else array[url]
  end,
  discovery_keywords = case id
    when 'pokemon-card-tcg' then array['拡張パック','抽選','ポケモンカード','取扱店','booster','lottery']
    when 'pokemon-goods-center' then array['ポケモンセンター','限定','グッズ','キャンペーン','Pokemon Center','exclusive']
    when 'bandai-hobby-kuji-prize' then array['ガンプラ','一番くじ','プライズ','フィギュア','再販','Gunpla','Ichiban Kuji','prize']
    when 'dragonball-official' then array['ドラゴンボール','フィギュア','カード','イベント','Dragon Ball','figure']
    when 'hololive-official' then array['ホロライブ','グッズ','コラボ','フェア','Hololive','goods']
    when 'figure-makers-preorder' then array['予約開始','出荷','再販','フィギュア','preorder','shipping']
    when 'gashapon-prize-arcade' then array['ガシャポン','プライズ','投入','対象店舗','gashapon','prize']
    when 'restaurant-chain-collabs' then array['コラボ','キャンペーン','特典','対象店舗','collab','campaign']
    when 'convenience-retail-anime-shops' then array['コラボ','一番くじ','クリアファイル','購入制限','collab','lottery']
    when 'publishers-shueisha-jump' then array['新刊','特装版','新連載','作者','new volume','special edition']
    when 'publishers-kodansha-shogakukan' then array['新刊','アニメ化','作家新作','フェア','new volume','anime adaptation']
    when 'anime-adaptation-events' then array['アニメ化','2期','映画','展示','物販','anime adaptation','exhibition']
    when 'local-tourism-pilgrimage' then array['聖地巡礼','マンホール','自治体コラボ','観光マップ','pilgrimage','manhole']
    else '{}'
  end,
  updated_at = now();

-- Convenience/retail official campaigns are now included in monitoring v1.
update public.official_sources
set check_mode = 'auto', cadence = 'daily', updated_at = now()
where id = 'convenience-retail-anime-shops';

-- RLS still restricts these tables to public.is_admin(); these grants only let
-- authenticated admin JWTs reach the policies from the static app.
grant select, insert on public.source_checks to authenticated;
grant select, insert, update on public.ingest_runs to authenticated;
grant select, insert, update, delete on public.intake_candidates to authenticated;
grant select, insert, update, delete on public.moderation_rules to authenticated;
grant select, insert on public.admin_decisions to authenticated;
grant select, insert on public.moderation_notes to authenticated;
