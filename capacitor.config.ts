import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor loads the live Next.js deployment in a WebView (not a static export).
 * Set CAPACITOR_SERVER_URL to your production URL (e.g. https://app.scanjob.co.uk).
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ?? "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "uk.co.scanjob.app",
  appName: "AGA",
  webDir: "capacitor-web",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
