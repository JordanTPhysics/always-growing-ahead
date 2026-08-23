import { connection } from "next/server";

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

/** Maps key/id for the browser. Read at request time — never baked into the JS bundle. */
export async function getMapsBrowserConfig() {
  await connection();
  return {
    apiKey: firstEnv("GOOGLE_MAPS_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
    mapId:
      firstEnv("GOOGLE_MAPS_MAP_ID", "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID") ||
      "DEMO_MAP_ID",
  };
}
