# User-supplied Mello logo

Source: https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/xgnt8aha_1789740818648.jpg

Latest explicit app name: **Mello**. Internal storage prefix and existing native
package/bundle identifiers/deep-link schemes stay stable to preserve users,
notifications and compatibility. They are not displayed branding.

User approved retaining the light-gray photographic background, original colors
and artwork, using the image as both in-app logo and launcher icon. Source is
713×837; square crop `(33,160,666,793)` removes only surplus gray margins.
No redraw, no generative image, no stretching. Source retained as brand-original.jpg.

All derivatives archived in Emergent Managed Object Storage; downloads verified
byte-for-byte against SHA256 on 2026-09-18. Local copies are mandatory for native
launcher/splash and offline in-app rendering; no private storage key is bundled.

| Bundled asset | Size | Managed storage object (prefix `linguaconnect/uploads/branding/`) |
|---|---|---|
| icon.png | 1024×1024 RGB, opaque iOS/legacy Android | e469cd45-2026-5f96-92a8-d7b48f9f2e46.png |
| adaptive-icon.png | 1080×1080, artwork padded | a22727e3-ccbe-56c1-9893-b165bf6b5e0c.png |
| splash-icon.png | 512×512 | 81614847-8259-5c73-86a0-6ed3b3aa8123.png |
| brand-logo.png | 256×256 | 41871d0e-fe4e-5510-b9c0-e83ea6c4ac6f.png |
| favicon.png | 64×64 | a745cbe6-7055-5e24-b340-eda3ebca0c3a.png |
| notification-icon.png | 96×96 white/alpha silhouette | 7b6817d7-a613-521f-879d-386a81a07a90.png |

Reproduction: `scripts/prepare_brand_assets.py` with server-side storage credential
supplied via environment. App code does NOT call storage or require a key.
Icon SHA256: bc0d903fce58cba9abee493d07f553d7e98179e973d7dcbcb52b823b11d21696.
Adaptive SHA256: c4cf60b715a5a288f0f3e1aafd0ba57c9019da774ecd241c1b99d2f7261fd7eb.

Adaptive safe-circle recheck: colored artwork (HSV saturation >65) has maximum
radius **327.87px**, inside Android's central **330px** safe-circle on1080px.
The tester's non-background-pixel check included the retained gray photographic
shadow; no colored logo pixels are clipped. Physical launcher masks still need
an installed native binary.

Native launcher/splash changes require installing a newly built binary; Metro
hot reload updates the in-app logo only. Physical launcher mask checks remain
separate from source/config verification.