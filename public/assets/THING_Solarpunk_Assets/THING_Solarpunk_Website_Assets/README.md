# THING — Solarpunk Website Asset Pack

Source: approved minimalist pixel-art website mockup (941×1672).

## Folders

- `backgrounds/exact`: faithful crops of each of the four stacked website screens, including all UI and objects as shown.
- `backgrounds/clean`: reconstructed environment-only backgrounds, with foreground/interface removed as far as possible. Because the source artwork is flattened, obscured details have been approximated, particularly for the passport greenhouse.
- `sprites/characters`: transparent PNGs extracted from the approved image: home robot, emotion robot, rainy robot, cat, elder.
- `sprites/props`: transparent umbrella, umbrella canopy, cursor hand, basket, passport book, award medal, plant.
- `sprites/interface`: original logo, subtitle, hero CTA, emotion panel, headers, navbar, arrows and HUD pieces. Some text-only extractions are imperfect due to colors shared with the background; use actual React text for crisp interface copy.
- `reference/approved_mockup.png`: full original reference.
- `layout.json`: source bounds and sprite positions (x/y from upper-left of each section).
- `previews`: quick visual checks.

## React / Create React App

Copy your desired folders into `public/assets/thing/`.

```jsx
const root = `${process.env.PUBLIC_URL || ""}/assets/thing`;
<img src={`${root}/sprites/characters/rain_cat.png`} alt="" />
```

The `clean` backgrounds are intentionally not advertised as pixel-identical unseen artwork; only the exact cropped screen images and source-extracted sprites directly preserve the screenshot pixels.
