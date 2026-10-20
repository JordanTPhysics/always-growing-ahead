"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  MAP_FOCUS_STORAGE_KEY,
  MAP_INTRO_STORAGE_KEY,
  POSTCODE_AREA_ZOOM,
  type MapCameraTarget,
} from "@/lib/maps/camera";

type LocatedProfile = {
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
};

function readCachedFocus(): MapCameraTarget | null {
  try {
    const raw = sessionStorage.getItem(MAP_FOCUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MapCameraTarget>;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.zoom !== "number"
    ) {
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng, zoom: parsed.zoom };
  } catch {
    return null;
  }
}

async function geocodePostcode(
  postcode: string
): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `/api/postcodes?resolve=1&q=${encodeURIComponent(postcode)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: { lat?: number; lng?: number } };
  const lat = Number(data.result?.lat);
  const lng = Number(data.result?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function directCoords(
  profile: LocatedProfile | null
): { lat: number; lng: number } | null {
  if (!profile) return null;
  const lat = Number(profile.location_lat);
  const lng = Number(profile.location_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (profile.location_lat == null || profile.location_lng == null) return null;
  return { lat, lng };
}

async function readLocatedProfile(
  url: string
): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { profile?: LocatedProfile | null };
  const profile = data.profile ?? null;
  const direct = directCoords(profile);
  if (direct) return direct;
  const postcode = profile?.postcode?.trim();
  if (!postcode) return null;
  return geocodePostcode(postcode);
}

async function resolveUserMapFocus(
  postcode: string | null | undefined,
  authenticated: boolean
): Promise<MapCameraTarget | null> {
  const trimmed = postcode?.trim() ?? "";
  const [geocoded, profiles] = await Promise.all([
    trimmed ? geocodePostcode(trimmed) : Promise.resolve(null),
    authenticated
      ? Promise.all([
          readLocatedProfile("/api/workers?mine=1"),
          readLocatedProfile("/api/employers?mine=1"),
        ])
      : Promise.resolve([null, null] as const),
  ]);
  const located = geocoded ?? profiles[0] ?? profiles[1];
  if (!located) return null;
  return { ...located, zoom: POSTCODE_AREA_ZOOM };
}

export function useUserMapFocus() {
  const { data: session, status } = useSession();
  const [checked, setChecked] = useState(false);
  const [playIntro, setPlayIntro] = useState(false);
  const [focus, setFocus] = useState<MapCameraTarget | null>(null);

  useEffect(() => {
    setPlayIntro(sessionStorage.getItem(MAP_INTRO_STORAGE_KEY) !== "1");
    const cached = readCachedFocus();
    if (cached) setFocus(cached);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const postcode = session?.user?.postcode;
    resolveUserMapFocus(postcode, status === "authenticated")
      .then((target) => {
        if (cancelled) return;
        if (!target) {
          try {
            sessionStorage.removeItem(MAP_FOCUS_STORAGE_KEY);
          } catch {
            // Ignore storage failures.
          }
          setFocus(null);
          return;
        }
        try {
          sessionStorage.setItem(MAP_FOCUS_STORAGE_KEY, JSON.stringify(target));
        } catch {
          // Ignore storage failures; the camera still uses the resolved focus.
        }
        setFocus((current) => {
          if (
            current &&
            Math.abs(current.lat - target.lat) < 0.0001 &&
            Math.abs(current.lng - target.lng) < 0.0001 &&
            current.zoom === target.zoom
          ) {
            return current;
          }
          return target;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, session?.user?.postcode]);

  return { checked, playIntro, focus };
}

export function markMapIntroPlayed() {
  try {
    sessionStorage.setItem(MAP_INTRO_STORAGE_KEY, "1");
  } catch {
    // Private browsing can block storage; the intro can play again next time.
  }
}
