# Mello — current transparent user-uploaded artwork

Latest source (supersedes the earlier gray-background JPG):
https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/rizf8n77_1000101542.png

Source713×837RGBA, alpha0..255. Crop only fullytransparent margins at
`(84,226,595,705)`, center withpadding; no redrawing/recoloring/background removal.
Source saved as brand-original.png. OldJPG is historical, no longer referenced.

## Platform behavior
- Defaulticon, Androidlegacy/adaptiveforeground, in-applogo, favicon andsplashart
  retain REALalpha transparency. AppLogo adds no baked background or rounded frame.
- AppleAppStore appicons CANNOTcontainalpha: **ios-icon.png only** is the sameart
  composited ontoopaque white. Explicitios.icon override; defaulticonstaysRGBA.
- AdaptiveAndroidlauncher supplies itsownmask/background; foregroundhasalpha.
  Backgroundwhite; artworkscaled636into1080withsafe-radiuspadding.
- SplashPNGis transparent; native/JSscreenbackgrounduseslight#FFFFFF anddark
  #0B1220surfaces. No oldgrayrectangle. Startup BrandSplashneedsnonetwork/customfont.
- Native launcher/splash appearance requires anupdatedinstalledbinary;
  browserstartup and PNGalpha checks are notdeviceproof.

## Managed object storage archive
All8bundledfiles uploaded andreadbackverifiedbySHA256. Prefix:
`linguaconnect/uploads/branding/` (historicalinternalprefixkept; publicnameMello).

| Bundledfile | Format/size | Managedobject |
|---|---|---|
| icon.png | RGBA1024 | 16aa51ae-9cd9-535b-9abf-af9cd0283f79.png |
| android-icon.png | RGBA1024 | 16aa51ae-9cd9-535b-9abf-af9cd0283f79.png |
| ios-icon.png | RGB1024,opaque | 1223b8a0-00c7-5ef1-b25e-891db65b036d.png |
| adaptive-icon.png | RGBA1080 | b5bec596-8142-5da0-b71d-ccedb11deac8.png |
| splash-icon.png | RGBA512 | ad7b3c07-7e90-503f-8400-4483192d4a7d.png |
| brand-logo.png | RGBA256 | ac25f02f-41e1-52c2-bb64-c06e472b7eb7.png |
| favicon.png | RGBA64 | e21ec8b0-ffe9-5615-a7b8-70ab3298700f.png |
| notification-icon.png | RGBA96,whitesilhouette | 613bb7d8-f65e-53c2-838a-39e1d6948b88.png |

DefaulticonSHA256:2f89dfe312201f0123f0d25862801a6f54314da19da815eae63a221f9e578050.
iOSiconSHA256:130e27fefcfdb14311eee8d7b6369b2b8c45557355b783149c8a7463182ac331.
SplashSHA256:4abf3ae34b8c2800b2061988a17dfed0f49ba4a8ec085fb9e99d6582afd17c92.
Reproducewithscripts/prepare_brand_assets.py andserver-side storagecredential in
environment; no storagekey in appbundle. Publicappidentifiers unchangedbybranding.