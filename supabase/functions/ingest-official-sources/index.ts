import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type OfficialSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  check_mode: string;
  watch_urls: string[] | null;
  discovery_keywords: string[] | null;
  robots_checked_at: string | null;
  terms_note: string | null;
};

type SourceCheck = {
  hash: string | null;
  links_json: { links?: string[] } | null;
};

type CandidateLink = {
  url: string;
  text: string;
  sourceUrl: string;
};

type TrackingRequestFeedRow = {
  id: string;
  term: string;
  status: string;
  official_url: string | null;
  matched_source_id: string | null;
  tracking_keywords: string[] | null;
  watch_strategy: string | null;
  search_count: number | null;
  candidate_votes: number | null;
  problem_votes: number | null;
};

type RequestWatchTarget = {
  requestId: string;
  term: string;
  officialUrl: string;
  keywords: string[];
  searchCount: number;
  candidateVotes: number;
  problemVotes: number;
};

type RequestLinkMatch = CandidateLink & {
  requestId: string;
  term: string;
  officialUrl: string;
  keywords: string[];
  matchedKeyword: string;
  searchCount: number;
  candidateVotes: number;
  problemVotes: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUrl(raw: string, baseUrl: string) {
  try {
    const url = new URL(raw, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function htmlText(value: string) {
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

function extractCandidateLinks(html: string, baseUrl: string, keywords: string[]) {
  const links = new Map<string, CandidateLink>();
  const baseHost = hostOf(baseUrl);
  const loweredKeywords = keywords.map((item) => item.toLowerCase()).filter(Boolean);
  const hrefPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html))) {
    const normalized = normalizeUrl(match[1], baseUrl);
    if (!normalized) continue;
    if (!normalized.startsWith("http")) continue;
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf)(\?|$)/i.test(normalized)) continue;
    const linkHost = hostOf(normalized);
    if (baseHost && linkHost && linkHost !== baseHost && !linkHost.endsWith(`.${baseHost}`) && !baseHost.endsWith(`.${linkHost}`)) continue;
    const text = htmlText(match[2]);
    const haystack = `${normalized} ${text}`.toLowerCase();
    const keywordHit = !loweredKeywords.length || loweredKeywords.some((keyword) => haystack.includes(keyword));
    const usefulPath = /(news|campaign|products?|goods|event|fair|book|item|schedule|calendar|collab|cp|info|release|kuji|gasha|prize)/i.test(normalized);
    if (!keywordHit && !usefulPath) continue;
    links.set(normalized, { url: normalized, text, sourceUrl: baseUrl });
    if (links.size >= 120) break;
  }
  return [...links.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function riskLevelForLink(link: CandidateLink) {
  const lower = `${link.url} ${link.text}`.toLowerCase();
  if (/(adult|r18|18禁|nsfw|ero|hentai)/i.test(lower)) return "block";
  if (/(campaign|products|product|news|event|shop|store|lottery|kuji|gasha|prize)/i.test(lower)) return "safe";
  return "review";
}

function compactMatchText(value: string) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function trackingKeywords(row: TrackingRequestFeedRow) {
  const values = [
    ...(Array.isArray(row.tracking_keywords) ? row.tracking_keywords : []),
    row.term
  ].map((keyword) => String(keyword || "").trim()).filter((keyword) => keyword.length >= 2);
  return [...new Set(values)].slice(0, 12);
}

function requestWatchTarget(row: TrackingRequestFeedRow): RequestWatchTarget | null {
  const keywords = trackingKeywords(row);
  if (!row.id || !row.term || !keywords.length) return null;
  if (row.status !== "approved" || row.watch_strategy !== "reuse_source" || !row.matched_source_id) return null;
  return {
    requestId: row.id,
    term: row.term,
    officialUrl: row.official_url || "",
    keywords,
    searchCount: Number(row.search_count || 0),
    candidateVotes: Number(row.candidate_votes || 0),
    problemVotes: Number(row.problem_votes || 0)
  };
}

function linkMatchesRequest(link: CandidateLink, request: RequestWatchTarget) {
  const haystack = compactMatchText(`${link.url} ${link.text}`);
  for (const keyword of request.keywords) {
    const needle = compactMatchText(keyword);
    if (needle.length >= 2 && haystack.includes(needle)) return keyword;
  }
  return "";
}

function requestMatchesForLinks(requests: RequestWatchTarget[], links: CandidateLink[]) {
  const matches: RequestLinkMatch[] = [];
  const seen = new Set<string>();
  for (const request of requests) {
    let perRequest = 0;
    for (const link of links) {
      const matchedKeyword = linkMatchesRequest(link, request);
      if (!matchedKeyword) continue;
      const key = `${request.requestId}|${link.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        ...link,
        requestId: request.requestId,
        term: request.term,
        officialUrl: request.officialUrl,
        keywords: request.keywords,
        matchedKeyword,
        searchCount: request.searchCount,
        candidateVotes: request.candidateVotes,
        problemVotes: request.problemVotes
      });
      perRequest += 1;
      if (perRequest >= 5) break;
    }
  }
  return matches;
}

function requestCandidateKey(match: RequestLinkMatch) {
  return `${match.requestId}|${match.url}`;
}

async function handleRequest(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") {
    return json({
      ok: true,
      function: "ingest-official-sources",
      hasSupabaseUrl: Boolean(Deno.env.get("SUPABASE_URL")),
      hasServiceRoleKey: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      hasIngestSecret: Boolean(Deno.env.get("INGEST_CRON_SECRET")),
      note: "POST with dryRun=true to test official-source checks. Public drops are never written by this function."
    });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ingestSecret = Deno.env.get("INGEST_CRON_SECRET");
  if (!supabaseUrl || !serviceKey) return json({ error: "Missing Supabase env" }, 500);
  if (ingestSecret && req.headers.get("x-ingest-secret") !== ingestSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = Boolean(body.dryRun);
  const sourceIds = Array.isArray(body.sourceIds) ? body.sourceIds.map(String) : [];
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const runInsert = await supabase
    .from("ingest_runs")
    .insert({ dry_run: dryRun, status: "running", meta_json: { sourceIds } })
    .select("id")
    .single();
  if (runInsert.error) return json({ error: runInsert.error.message }, 500);
  const runId = runInsert.data.id;

  let sourceCount = 0;
  let candidateCount = 0;
  const results: Array<Record<string, unknown>> = [];

  try {
    let sourceQuery = supabase
      .from("official_sources")
      .select("id,name,url,category,check_mode,watch_urls,discovery_keywords,robots_checked_at,terms_note")
      .neq("check_mode", "disabled");
    if (sourceIds.length) sourceQuery = sourceQuery.in("id", sourceIds);

    const { data: sources, error: sourceError } = await sourceQuery;
    if (sourceError) throw sourceError;

    const { data: requestRows, error: requestError } = await supabase
      .from("tracking_request_feed")
      .select("id,term,status,official_url,matched_source_id,tracking_keywords,watch_strategy,search_count,candidate_votes,problem_votes")
      .eq("status", "approved")
      .eq("watch_strategy", "reuse_source");
    if (requestError) throw requestError;

    const requestsBySource = new Map<string, RequestWatchTarget[]>();
    for (const row of (requestRows || []) as TrackingRequestFeedRow[]) {
      const target = requestWatchTarget(row);
      if (!target || !row.matched_source_id) continue;
      const list = requestsBySource.get(row.matched_source_id) || [];
      list.push(target);
      requestsBySource.set(row.matched_source_id, list);
    }

    for (const source of (sources || []) as OfficialSource[]) {
      sourceCount += 1;
      if (!source.url || !source.robots_checked_at) {
        results.push({ sourceId: source.id, skipped: true, reason: "robots_not_checked" });
        continue;
      }

      const watchUrls = [...new Set([source.url, ...(source.watch_urls || [])].filter(Boolean))];
      const sourceRequests = requestsBySource.get(source.id) || [];
      const requestKeywords = sourceRequests.flatMap((request) => request.keywords);
      const keywords = [...new Set([...(source.discovery_keywords || []), ...requestKeywords])];
      const pageResults: Array<Record<string, unknown>> = [];
      const fetchErrors: Array<Record<string, unknown>> = [];
      const candidateMap = new Map<string, CandidateLink>();

      const pageAttempts = await Promise.allSettled(watchUrls.map(async (watchUrl) => {
          const response = await fetch(watchUrl, {
            headers: {
              "User-Agent": "DropRadar/0.1 official-source-check; contact=dropradar.helpdesk@gmail.com"
            }
          });
          const html = await response.text();
          const pageHash = await sha256(html);
          const pageLinks = extractCandidateLinks(html, watchUrl, keywords);
          pageLinks.forEach((link) => candidateMap.set(link.url, link));
          pageResults.push({
            source_url: watchUrl,
            status: response.status,
            ok: response.ok,
            hash: pageHash,
            candidate_links: pageLinks.length
          });
        }));
      pageAttempts.forEach((attempt, index) => {
        if (attempt.status === "fulfilled") return;
        fetchErrors.push({
          source_url: watchUrls[index],
          error: attempt.reason instanceof Error ? attempt.reason.message : String(attempt.reason)
        });
      });

      const links = [...candidateMap.values()].sort((a, b) => a.url.localeCompare(b.url)).slice(0, 300);
      const linkUrls = links.map((link) => link.url);
      const hash = await sha256(JSON.stringify({ pages: pageResults, links: linkUrls }));

      const { data: previous } = await supabase
        .from("source_checks")
        .select("hash,links_json")
        .eq("source_id", source.id)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle<SourceCheck>();

      const previousLinks = new Set(previous?.links_json?.links || []);
      const currentLinks = new Set(linkUrls);
      const firstRun = !previous;
      const addedLinks = firstRun ? [] : links.filter((link) => !previousLinks.has(link.url));
      const removedLinks = firstRun ? [] : [...previousLinks].filter((link) => !currentLinks.has(link));
      const requestMatches = sourceRequests.length ? requestMatchesForLinks(sourceRequests, links) : [];
      let existingRequestCandidateKeys = new Set<string>();
      if (requestMatches.length) {
        const existing = await supabase
          .from("intake_candidates")
          .select("request_id,official_url")
          .eq("source_id", source.id)
          .not("request_id", "is", null)
          .limit(1000);
        if (existing.error) throw existing.error;
        existingRequestCandidateKeys = new Set((existing.data || []).map((item) => `${item.request_id}|${item.official_url}`));
      }
      const newRequestMatches = requestMatches.filter((match) => !existingRequestCandidateKeys.has(requestCandidateKey(match)));
      const requestCandidateUrls = new Set(newRequestMatches.map((match) => match.url));
      const generalAddedLinks = addedLinks.filter((link) => !requestCandidateUrls.has(link.url));

      if (!dryRun) {
        const checkInsert = await supabase.from("source_checks").insert({
          source_id: source.id,
          hash,
          added_count: addedLinks.length,
          removed_count: removedLinks.length,
          links_json: {
            links: linkUrls,
            candidates: links.map((link) => ({ url: link.url, source_url: link.sourceUrl })),
            request_matches: requestMatches.map((match) => ({
              request_id: match.requestId,
              term: match.term,
              url: match.url,
              source_url: match.sourceUrl,
              keyword: match.matchedKeyword,
              search_count: match.searchCount,
              candidate_votes: match.candidateVotes,
              problem_votes: match.problemVotes
            })),
            pages: pageResults,
            errors: fetchErrors
          },
          review_status: addedLinks.length || newRequestMatches.length ? "needs_review" : fetchErrors.length ? "partial" : "checked",
          note: "Generated by ingest-official-sources. Human review is required before publishing. Do not copy official page text into public cards."
        });
        if (checkInsert.error) throw checkInsert.error;
      }

      for (const link of generalAddedLinks) {
        const risk = riskLevelForLink(link);
        candidateCount += 1;
        if (!dryRun) {
          const candidateInsert = await supabase.from("intake_candidates").insert({
            source_id: source.id,
            title: `${source.name}: official link candidate`,
            official_url: link.url,
            risk_level: risk,
            review_status: risk === "block" ? "quarantined" : "pending",
            signals_json: {
              run_id: runId,
              source_url: link.sourceUrl,
              link_text_seen: Boolean(link.text),
              category: source.category,
              terms_note: source.terms_note,
              reason: "new_official_link"
            },
            moderation_note: risk === "block"
              ? "Blocked by URL keyword risk. Admin review required."
              : "Official-source diff candidate. Open the official URL and write an original summary before publishing."
          });
          if (candidateInsert.error) throw candidateInsert.error;
        }
      }

      for (const match of newRequestMatches) {
        const risk = riskLevelForLink(match);
        candidateCount += 1;
        if (!dryRun) {
          const candidateInsert = await supabase.from("intake_candidates").insert({
            source_id: source.id,
            request_id: match.requestId,
            title: `${source.name}: tracking request match - ${match.term}`,
            official_url: match.url,
            risk_level: risk,
            review_status: risk === "block" ? "quarantined" : "pending",
            signals_json: {
              run_id: runId,
              source_url: match.sourceUrl,
              link_text_seen: Boolean(match.text),
              link_text: match.text.slice(0, 180),
              category: source.category,
              terms_note: source.terms_note,
              reason: "tracking_request_match",
              request_id: match.requestId,
              request_term: match.term,
              matched_keyword: match.matchedKeyword,
              search_count: match.searchCount,
              candidate_votes: match.candidateVotes,
              problem_votes: match.problemVotes
            },
            moderation_note: risk === "block"
              ? "Tracking request match was blocked by keyword risk. Admin review required."
              : "Approved tracking request matched an official-source link. Open the official URL and write an original summary before publishing."
          });
          if (candidateInsert.error) throw candidateInsert.error;
        }
      }

      results.push({
        sourceId: source.id,
        status: fetchErrors.length && pageResults.length ? "partial" : fetchErrors.length ? "failed" : "ok",
        watchUrls: watchUrls.length,
        errors: fetchErrors,
        firstRun,
        hashChanged: previous?.hash ? previous.hash !== hash : false,
        currentLinks: linkUrls.length,
        addedLinks: addedLinks.length,
        removedLinks: removedLinks.length,
        trackingRequests: sourceRequests.length,
        requestMatches: requestMatches.length,
        requestCandidates: newRequestMatches.length
      });
    }

    await supabase.from("ingest_runs").update({
      status: "complete",
      source_count: sourceCount,
      candidate_count: candidateCount,
      finished_at: new Date().toISOString(),
      meta_json: { sourceIds, results }
    }).eq("id", runId);

    return json({ runId, dryRun, sourceCount, candidateCount, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("ingest_runs").update({
      status: "failed",
      source_count: sourceCount,
      candidate_count: candidateCount,
      finished_at: new Date().toISOString(),
      error: message,
      meta_json: { sourceIds, results }
    }).eq("id", runId);
    return json({ runId, error: message, results }, 500);
  }
}

export default {
  fetch: handleRequest
};
