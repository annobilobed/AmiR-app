# Aimr logo: Trajectory

A gently curving, rising path of dots lands in a target. Each dot is a semester, growing in
confidence as it climbs; the target is the class of degree the student is
aiming for. Aim higher, one semester at a time.

## Files

| File | Use |
|---|---|
| `aimr-icon.svg` | Main app icon (rounded gradient tile) |
| `aimr-favicon.svg`, `favicon.ico`, `favicon-16/32/48.png` | Browser tab. A simplified mark (three bold dots on the same arc, heavier ring) that stays clear at 16 px |
| `icon-192.png`, `icon-512.png` | Web-app manifest icons |
| `icon-maskable-512.png`, `aimr-icon-maskable.svg` | Android adaptive icon (full-bleed, mark inside the safe zone) |
| `apple-touch-icon.png` | iPhone home screen (180 px, square; iOS rounds the corners) |
| `aimr-logo-horizontal-light/dark.svg` | Site header, emails, documents |
| `aimr-logo-vertical-light/dark.svg` | Splash screen, social profiles, posters |
| `aimr-mark-ink/purple/white.svg` | One-colour mark, no tile (print, stamps, watermarks, on photos) |
| `aimr-wordmark-ink/white.svg` | Name only, for tight horizontal spaces |
| `brand-sheet.html` | Overview of everything above |

The "aimr" lettering is drawn as shapes, not a font, so it looks the same everywhere.

## Next.js setup

Put the files in `public/`, then in `app/layout.tsx`:

```tsx
export const metadata = {
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/aimr-favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};
```

`public/manifest.webmanifest`:

```json
{
  "name": "Aimr",
  "short_name": "Aimr",
  "theme_color": "#534AB7",
  "background_color": "#0E0D1A",
  "display": "standalone",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Colours

| Name | Hex | Role |
|---|---|---|
| Purple | `#534AB7` | Primary, i-dot on light |
| Blue | `#185FA5` | Gradient middle |
| Teal | `#0F6E56` | Gradient end |
| Rose | `#993556` | Corner glow |
| Ink | `#17162B` | Wordmark on light |
| Night | `#0E0D1A` | Dark background |
| Lilac | `#9B93F0` | i-dot on dark |

## Rules

- **Clear space:** keep empty space around the logo at least the width of the target ring.
- **Minimum size:** horizontal logo 100 px wide; icon 16 px (use the favicon version below 48 px).
- **On dark backgrounds** use the dark versions or the white mark; on photos use the white mark.
- **Don't** stretch, rotate, recolour outside the palette, add shadows or outlines, or rearrange the dots.
