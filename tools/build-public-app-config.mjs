import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localConfigPath = path.join(root, "data", "app-config.json");
const outputPath = path.join(root, "data", "app-config.public.json");

if (!fs.existsSync(localConfigPath)) {
  throw new Error("data/app-config.json is required to build the public config.");
}

const localConfig = JSON.parse(fs.readFileSync(localConfigPath, "utf8").replace(/^\uFEFF/, ""));
const supabase = localConfig.supabase || {};

if (!supabase.url || !supabase.anonKey) {
  throw new Error("Supabase url and anonKey are required.");
}

const publicConfig = {
  environment: "github-pages",
  features: {
    supabase: true,
    remoteReads: true,
    remoteWrites: true,
    remoteAdminWrites: true,
    adminReview: true,
    locationHistory: false,
    loginlessRequests: true
  },
  supabase: {
    url: supabase.url,
    anonKey: supabase.anonKey,
    adminAccessToken: ""
  },
  sync: {
    readTables: [
      "drops",
      "official_sources",
      "spot_locations",
      "tracking_request_feed"
    ],
    requestRpc: [
      "submit_tracking_request",
      "vote_tracking_request"
    ],
    adminRpc: [
      "admin_set_tracking_request"
    ],
    notes: [
      "Public GitHub Pages config. Contains only Supabase URL and anon key.",
      "Do not add service-role keys, admin JWTs, database passwords, or ingest secrets here.",
      "Anonymous request writes are limited to RPC calls by the Supabase policy.",
      "Admin actions still require Supabase Auth with app_metadata.role=admin.",
      "User GPS location is never stored or sent by this config."
    ]
  }
};

fs.writeFileSync(outputPath, `${JSON.stringify(publicConfig, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
