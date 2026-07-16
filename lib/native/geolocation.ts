import { Geolocation } from "@capacitor/geolocation";
import { isNativePlatform } from "@/lib/native/platform";

export type LatLng = { lat: number; lng: number };

/** Prefer Capacitor on native; fall back to browser geolocation on web. */
export async function getCurrentPosition(): Promise<LatLng | null> {
  try {
    if (isNativePlatform()) {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== "granted") return null;
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return null;
    }

    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12_000 }
      );
    });
  } catch {
    return null;
  }
}
