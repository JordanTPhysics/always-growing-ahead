import { connection } from "next/server";

function readEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

/** Maps key/id for the browser. Read at request time — never baked into the JS bundle. */
export async function getMapsBrowserConfig() {
  await connection();
  return {
    apiKey:
      readEnv("GOOGLE_MAPS_API_KEY") || readEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
    mapId:
      readEnv("GOOGLE_MAPS_MAP_ID") ||
      readEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID") ||
      "DEMO_MAP_ID",
  };
}
