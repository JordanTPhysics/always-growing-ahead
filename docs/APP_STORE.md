# AGA — App Store / Play Store prep

Capacitor points the native shell at the **live** Next.js deployment (`CAPACITOR_SERVER_URL`). Do not use `output: 'export'`.

## One-time setup

1. Set `CAPACITOR_SERVER_URL=https://your-production-host` (and rebuild config).
2. `npm run cap:sync`
3. Open Android Studio / Xcode: `npm run cap:open:android` / `npx cap open ios` (iOS requires macOS).

## Permission usage strings

### iOS (`Info.plist`)
- `NSLocationWhenInUseUsageDescription` — Find jobs and workers near you.
- `NSCameraUsageDescription` — Capture profile photos and certificates.
- `NSPhotoLibraryUsageDescription` — Choose profile photos and certificates.

### Android (`AndroidManifest.xml`)
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`
- `CAMERA`
- `POST_NOTIFICATIONS` (API 33+)

## Privacy

Ship a public privacy policy (in-app: `/en/privacy`) covering location, contact data, and push tokens under UK GDPR.

## Firebase / FCM

1. Create a Firebase project; add iOS + Android apps.
2. Download `google-services.json` / `GoogleService-Info.plist`.
3. Set `FIREBASE_SERVER_KEY` (or FCM HTTP v1 credentials) on the server for push dispatch.
4. Device tokens are registered via `POST /api/device-tokens` when the native app starts signed-in.

## Store listing checklist

- [ ] Privacy policy URL
- [ ] UK company / developer account details
- [ ] Screenshots (phone + tablet)
- [ ] Age rating / content declarations
- [ ] Test with production Stripe keys (maps use MapLibre + OpenFreeMap — no Mapbox key)
