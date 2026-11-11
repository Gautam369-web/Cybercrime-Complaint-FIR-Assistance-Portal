# Twilight Valley background

Implemented in `src/TwilightBackground.tsx` with styling in `src/twilight-background.css`. The component is lazy-loaded once at the portal root, behind the existing village, account pages and glass panels. This implementation uses the requested CSS-layered approach. It creates depth with independently translated planes and atmospheric gradients.

## Delivered

- Obsidian gradient sky, faint stars and glowing low moon; Frost sunrise haze.
- Slow monochrome aurora, four mountain silhouettes, intermediate mist, valley river and muted amber lanterns.
- Drifting fog and sparse sparks on the right side, with a quiet reading area on the left and an edge vignette.
- Pointer parallax and opt-in device tilt. Settings contains “Enable background tilt”. Browsers requiring motion permission request it from that button's user gesture.
- Dock selections alter the parallax offset. Opening a building or the account view gently dims and blurs the wallpaper.
- Theme variants cross-fade over 1.1 seconds. A registered scrim color interpolates at the same time. Existing theme transition and glass lens behavior remain available.
- Low-memory devices, reduced motion, 2D mode, unavailable WebGL or sustained frame rates below 40 fps select a static wallpaper. The low-power path also removes costly glass blur and pointer lenses. Background tabs pause ambient motion and parallax updates.
- Local WebP images for both themes in desktop 1920×1080 and mobile 720×1280 aspect ratios, under `public/wallpapers/`. Combined size is approximately 50 KB. The images are pre-rendered from the exact authored landscape, with no external asset dependency. A theme gradient remains visible if an image fails to load.

## Reproduce

Start the local development server on port 5174. Run `node tools/render-wallpapers.mjs` to regenerate the WebP assets, and `node tests/twilight-qa.mjs` to exercise behavior and collect `docs/qa/twilight-report.json`. The renderer uses the development-only `tools/wallpaper-render.html` entry. Vite's production build includes the WebP assets and lazy component chunks.

## Contrast and readability

The test places representative glass cards over the bright moon region and the darkest near ridge. It hides each text node temporarily, captures the actual composited pixels through glass, and compares those pixels with the computed foreground color using WCAG relative luminance. Both headings and secondary text are measured at multiple points. Minimum recorded ratios were 10.00:1 for Obsidian and 6.34:1 for Frost, exceeding 4.5:1. The complete tested Home screen in both themes and Settings in desktop/mobile sizes had zero automated axe violations.

An initial Frost secondary-text sample measured 4.39:1. A previous Frost selector was overriding the reading scrim. The selector was corrected, and text-heavy cards now consistently receive the theme's reading surface. Footer, progress-summary and scene-caption scrims were also added after contrast inspection. Mobile testing exposed the old dark document background beneath Frost content outside the fixed wallpaper viewport. The document fallback now follows the theme.

These samples and automated checks cover the tested states. They are not a blanket accessibility certification for every browser, language or user setting.

## Behavior checks

Verified pointer movement, camera-offset changes between dock segments, focus dim/blur, an intermediate theme-crossfade opacity, decoded static images in reduced motion and 2D mode, 2 GB memory emulation, unavailable WebGL and failed-image gradient fallback. Synthetic device-orientation events moved parallax after opt-in. Actual iOS permission UI and physical device sensors have not been tested. Account login, registration, walkthrough and application form checks passed at widths 320, 390, 768 and 1440 pixels without horizontal overflow.

## Performance

Measurements use requestAnimationFrame intervals in local headless Chrome, a Pixel 7 mobile viewport and 4× CPU throttling. They are development-machine emulation, not physical-phone measurements.

The last recorded run measured 60.54 fps for the animated wallpaper layers alone. The full existing village plus wallpaper averaged 55.14 fps, with a 95th percentile frame interval of 33.3 ms. Earlier stressed runs fluctuated from roughly 25–50 fps. The 60 fps goal is met by the wallpaper in this test but is not consistently achieved by the complete village under throttling. Physical mid-range phone validation remains outstanding.

To limit cost, no second WebGL renderer is introduced. Parallax uses requestAnimationFrame only while settling. CSS animations update transforms, the inactive theme's animations pause, mobile reduces particles/blur, images are small, and sustained low frame rate selects the static low-power path. Static fallback and frame-rate sampling are browser-local decisions and never send complaint data elsewhere.

## Build

TypeScript and Vite production build passed. Vite continues to warn about the existing 518 KB Three.js chunk, loaded with the lazy village. The wallpaper's JavaScript is approximately 6 KB before gzip, with a separate approximately 9 KB CSS chunk.
