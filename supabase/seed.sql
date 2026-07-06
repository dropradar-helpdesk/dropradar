-- DropRadar seed data.
-- Review robots.txt and terms before setting robots_checked_at on any source.

insert into public.official_sources
  (id, name, url, category, check_mode, watch_urls, discovery_keywords, cadence, robots_checked_at, terms_note)
values
  ('pokemon-card-tcg', 'ポケカ/TCG公式商品', 'https://www.pokemon-card.com/products/', 'tcg', 'auto',
    array['https://www.pokemon-card.com/products/','https://www.pokemon-card.com/info/','https://www.pokemon-card.com/event/'],
    array['拡張パック','抽選','ポケモンカード','取扱店','booster','lottery'],
    'morning_evening', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('pokemon-goods-center', 'ポケモングッズ/ポケセン', 'https://www.pokemon.co.jp/goods/', 'pokemon_goods', 'auto',
    array['https://www.pokemon.co.jp/goods/','https://www.pokemoncenter-online.com/','https://www.pokemon.co.jp/ex/'],
    array['ポケモンセンター','限定','グッズ','キャンペーン','Pokemon Center','exclusive'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('bandai-hobby-kuji-prize', 'バンダイ系ホビー/くじ/プライズ', 'https://www.bandaispirits.co.jp/products/', 'hobby', 'auto',
    array['https://www.bandaispirits.co.jp/products/','https://1kuji.com/','https://bsp-prize.jp/','https://tamashiiweb.com/','https://bandai-hobby.net/'],
    array['ガンプラ','一番くじ','プライズ','フィギュア','再販','Gunpla','Ichiban Kuji','prize'],
    'twice_daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('dragonball-official', 'ドラゴンボール公式ニュース', 'https://dragon-ball-official.com/news/', 'anime_goods', 'auto',
    array['https://dragon-ball-official.com/news/','https://p-bandai.jp/chara/c0009/','https://www.carddass.com/dbh/'],
    array['ドラゴンボール','フィギュア','カード','イベント','Dragon Ball','figure'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('hololive-official', 'ホロライブ公式ニュース/グッズ', 'https://hololive.hololivepro.com/news/', 'vtuber_goods', 'auto',
    array['https://hololive.hololivepro.com/news/','https://shop.hololivepro.com/','https://hololive.hololivepro.com/events/'],
    array['ホロライブ','グッズ','コラボ','フェア','Hololive','goods'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('figure-makers-preorder', 'フィギュアメーカー/予約開始', 'https://www.goodsmile.info/', 'figure', 'auto',
    array['https://www.goodsmile.info/','https://www.kotobukiya.co.jp/product/','https://alter-web.jp/','https://www.megahobby.jp/'],
    array['予約開始','出荷','再販','フィギュア','preorder','shipping'],
    'weekday_morning_evening', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('gashapon-prize-arcade', 'ガシャポン/プライズ/アーケード', 'https://www.gashapon.jp/', 'arcade_prize', 'auto',
    array['https://www.gashapon.jp/','https://bsp-prize.jp/','https://tempo.gendagigo.jp/cp/','https://bandainamco-am.co.jp/'],
    array['ガシャポン','プライズ','投入','対象店舗','gashapon','prize'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('restaurant-chain-collabs', '外食チェーンコラボ', 'https://www.mcdonalds.co.jp/campaign/', 'restaurant_collab', 'auto',
    array['https://www.mcdonalds.co.jp/campaign/','https://www.yoshinoya.com/campaign/','https://www.sukiya.jp/news/','https://www.ichibanya.co.jp/cp/','https://www.skylark.co.jp/campaign/'],
    array['コラボ','キャンペーン','特典','対象店舗','collab','campaign'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('convenience-retail-anime-shops', 'コンビニ/小売/アニメショップ', 'https://www.family.co.jp/campaign.html', 'retail_collab', 'auto',
    array['https://www.family.co.jp/campaign.html','https://www.lawson.co.jp/lab/campaign/','https://www.sej.co.jp/cmp/','https://www.animate.co.jp/fair_event/','https://tower.jp/'],
    array['コラボ','一番くじ','クリアファイル','購入制限','collab','lottery'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('publishers-shueisha-jump', '集英社/ジャンプ/新刊', 'https://www.shueisha.co.jp/books/', 'publisher', 'auto',
    array['https://www.shueisha.co.jp/books/','https://www.shonenjump.com/j/','https://manga-plus.shueisha.co.jp/updates'],
    array['新刊','特装版','新連載','作者','new volume','special edition'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('publishers-kodansha-shogakukan', '講談社/小学館/新刊', 'https://kc.kodansha.co.jp/', 'publisher', 'auto',
    array['https://kc.kodansha.co.jp/','https://shogakukan-comic.jp/book','https://www.sunday-webry.com/'],
    array['新刊','アニメ化','作家新作','フェア','new volume','anime adaptation'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('anime-adaptation-events', 'アニメ化/イベント/展示', 'https://frieren-anime.jp/', 'anime_event', 'auto',
    array['https://frieren-anime.jp/','https://www.aniplex.co.jp/','https://www.tohoanimation.jp/'],
    array['アニメ化','2期','映画','展示','物販','anime adaptation','exhibition'],
    'daily', null, 'Review robots.txt and terms before enabling scheduled checks.'),
  ('local-tourism-pilgrimage', '自治体/観光/聖地巡礼', 'https://initiald-portal.com/', 'tourism', 'manual',
    array['https://initiald-portal.com/','https://animetourism88.com/','https://www.mlit.go.jp/'],
    array['聖地巡礼','マンホール','自治体コラボ','観光マップ','pilgrimage','manhole'],
    'weekly', null, 'Tourism and local-collab data should stay human-reviewed.')
on conflict (id) do update set
  name = excluded.name,
  url = excluded.url,
  category = excluded.category,
  check_mode = excluded.check_mode,
  watch_urls = excluded.watch_urls,
  discovery_keywords = excluded.discovery_keywords,
  cadence = excluded.cadence,
  terms_note = excluded.terms_note,
  updated_at = now();

insert into public.spot_locations
  (id, name_ja, name_en, category, lat, lng, map_query_ja, map_query_en, access_ja, access_en, official_url, published_at)
values
  ('kanda-myojin', '神田明神', 'Kanda Myojin Shrine', 'pilgrimage', 35.701700, 139.767200, null, null, 'JR秋葉原駅から徒歩約12分。坂と階段があるので暑さ・荷物がある日は無理しない。', 'About 12 minutes on foot from JR Akihabara. There are slopes and steps, so avoid forcing it with heat or luggage.', null, now()),
  ('manseibashi-shoheibashi', '万世橋・昌平橋エリア', 'Manseibashi / Shoheibashi area', 'pilgrimage', 35.697500, 139.770700, null, null, '秋葉原の店巡り途中に徒歩で寄りやすい。大通り沿いを優先すれば迷いにくい。', 'Easy to add on foot during an Akihabara shop loop. Main streets are easier to navigate.', null, now()),
  ('suga-shrine-steps', '須賀神社の階段', 'Suga Shrine steps', 'pilgrimage', 35.685200, 139.721400, null, null, '四谷方面へ電車移動して徒歩。秋葉原回収のついでなら時間と体力が余った時だけ。', 'Take the train toward Yotsuya, then walk. Add from Akihabara only if time and energy remain.', null, now()),
  ('ghibli-museum-inokashira', '三鷹の森ジブリ美術館・井の頭公園', 'Ghibli Museum and Inokashira Park', 'tourism', 35.696300, 139.570400, null, null, '三鷹または吉祥寺から徒歩/バス。チケット制なので当日寄り道扱いにしない。', 'Access from Mitaka or Kichijoji by foot or bus. Ticketed entry, so do not treat it as a same-day impulse stop.', null, now()),
  ('ikebukuro-otome-road', '池袋・乙女ロード/サンシャイン周辺', 'Ikebukuro Otome Road and Sunshine City', 'pilgrimage', 35.729400, 139.718900, null, null, '池袋駅から徒歩。サンシャイン方面の出口と帰りの改札を先に決めると迷いにくい。', 'Walk from Ikebukuro Station. Pick the Sunshine-side exit and return gate before moving.', null, now()),
  ('haruna-akina-model', '榛名山（秋名山モデル）', 'Mount Haruna (Akina model)', 'initial_d', 36.477100, 138.869500, null, null, '群馬方面の別日遠征。車/バス/観光導線を事前確認し、峠道は安全優先。', 'A separate Gunma day trip. Confirm car, bus, or sightseeing access first; safety beats route-chasing.', null, now()),
  ('usui-pass-meganebashi', '碓氷峠・めがね橋', 'Usui Pass / Meganebashi', 'initial_d', 36.336700, 138.737200, null, null, '安中/軽井沢方面の遠征候補。鉄道・バス・徒歩距離をセットで確認してから行く。', 'An Annaka / Karuizawa-area trip. Check train, bus, and walking distance together before going.', null, now()),
  ('poke-lids-official-map', 'ポケふた（ポケモンマンホール）', 'Poke Lids Pokemon manholes', 'local_collab', null, null, 'ポケふた 公式マップ', 'Poke Lids official map', '全国点在型。旅行先名と公式マップで探し、近くにある時だけ寄る。', 'Distributed across Japan. Search the official map with your destination city and add only if nearby.', null, now()),
  ('numazu-love-live-manhole', '沼津 ラブライブ！サンシャイン!! マンホール', 'Numazu Love Live! Sunshine!! manholes', 'local_collab', 35.102000, 138.860100, null, null, '沼津駅周辺回遊と相性が良い。設置場所は公式/自治体マップで最終確認。', 'Works well with a Numazu Station walking loop. Confirm exact lids on official or city maps.', null, now()),
  ('gundam-manhole-local', 'ガンダムマンホール', 'Gundam manhole covers', 'local_collab', null, null, 'ガンダムマンホール 自治体', 'Gundam manhole local government', '自治体ごとの設置。イベント先や宿泊先の近くにある場合だけ追加。', 'Installed by local governments. Add only when one is near your event area or hotel.', null, now())
on conflict (id) do update set
  name_ja = excluded.name_ja,
  name_en = excluded.name_en,
  category = excluded.category,
  lat = excluded.lat,
  lng = excluded.lng,
  map_query_ja = excluded.map_query_ja,
  map_query_en = excluded.map_query_en,
  access_ja = excluded.access_ja,
  access_en = excluded.access_en,
  official_url = excluded.official_url,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.moderation_rules
  (rule_type, pattern, action, severity, note)
values
  ('request_keyword', '(adult|r18|18禁|nsfw|ero|hentai|性的|露骨)', 'block', 5, 'Adult or explicit requests go to quarantine before any public handling.'),
  ('request_keyword', '(違法|海賊版|割れ|無断転載|流出|leak)', 'block', 5, 'Illegal, leaked, pirated, or rehosted content is not accepted.'),
  ('request_keyword', '(転売募集|買取募集|代行募集|resale solicitation)', 'review', 4, 'Resale-solicitation wording should be reviewed before becoming a tracking target.'),
  ('request_keyword', '(画像ください|スクショ|scan|raw|manga panel)', 'review', 4, 'Requests that imply image rehosting need human review and official-link-only handling.'),
  ('request_keyword', '(住所|電話番号|個人情報|dox|employee)', 'block', 5, 'Personal-data or doxxing requests are blocked.')
on conflict do nothing;
