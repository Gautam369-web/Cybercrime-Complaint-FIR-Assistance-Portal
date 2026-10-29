# The Village of Justice

An independent cybercrime complaint preparation prototype. No complaint is sent to police and no FIR is registered. The confirmation reference is explicitly a local demo reference.

## Run

Requires Node 22+.

```
npm install
npm run dev
npm run build
npm test
```

Browser QA: start Vite on port 5174, then run `node tests/browser-qa.mjs` (Chrome required).

## Experience and architecture

The primary persona is a stressed victim who needs a clear next action, including people unfamiliar with online forms. A secondary persona is a supporter helping someone prepare an account. Consent precedes personal data collection; one question at a time reduces burden. Optional questions can be skipped, and every answer can be edited.

Town Hall / Home provides language and start controls. Scribe’s Tower / Assistant collects details. Evidence Barn stores temporary files and URLs. Library / Review exposes editable fields, original narrative and a formatted draft. Watchtower / Status distinguishes preparation from official reporting. Guardian’s Hut / Help provides 1930 and official portal links. Fountain Square holds FAQs. The bridge visually connects the journey. The dock duplicates scene navigation for keyboard and non-3D use.

React + TypeScript + Vite; lazy-loaded Three.js scene; i18next locale files; browser memory is the authoritative complaint state. The scene uses actual MIT-licensed `create(params)` factories from the cloned 3dviz-pro-max repository. See src/vendor/3dviz/PROVENANCE.md and LICENSE.

## Design tokens

See src/styles.css. Obsidian background #101d23, text #f2f4f2, secondary text #b7c3c6. Frost background #e5ebe6, text #233438, secondary #4d6063. Glass fill 7.5% white in Obsidian, brighter Frost surfaces with opaque reading scrims. Blur 20px / saturation 155%; dock 26px. Border 1px; inset highlight plus 0 12px 40px shadow at 12% black. Cards 24px; controls pill shaped. Spacing generally 8/12/16/24/32px. Manrope headings and DM Sans body. Dock travel 420ms spring-like cubic-bezier; panel entry 400ms. Reduced motion disables transitions and scene creatures; reduced transparency uses solid panels.

Reusable components: GlassButton, GlassCard, GlassInput, GlassChip, GlassModal, GlassToast, BottomDock in src/components.tsx.

## Data and limits

Answers and evidence stay in tab memory. Explicit backups use AES-256-GCM and PBKDF2 SHA-256, 250,000 iterations, random salt and IV. Backups contain evidence metadata, not original file bytes. PDF uses the browser print dialog / Save as PDF. JSON export is deliberately plaintext. Quick exit replaces the page with Google; it cannot erase history or downloads.

Seven languages cover the core introduction, consent and questions. Supporting controls currently fall back to English. Script detection suggests a language; it is not a language-identification model. English formal headings retain the original narrative verbatim; automated translation and legal rewriting are not implemented. Speech availability depends on the browser and may involve its online speech service; consent is requested first.

This is a client-side guided questionnaire and local mock confirmation, not an AI service or a production backend. Official filing, real acknowledgement lookup, certified translation, and a human accessibility/localization audit remain production integration work. No blanket WCAG certification is claimed.

## References

- https://github.com/viettranx/3dviz-pro-max
- https://liquidglassdesign.com/ui
- https://liquidglassdesign.com/gallery/ios-26-liquid-glass-buttons
- https://liquidglassdesign.com/gallery/liquid-glass-button-in-framer
- https://www.cybercrime.gov.in/webform/FAQ.aspx
- https://www.mha.gov.in/MHA1/Par2017/pdfs/par2025-pdfs/LS16122025/2645.pdf (1930 / official portal)

docs/glass-reference.png was created with the built-in image-generation tool. Prompt: paired Frost and Obsidian material reference, monochrome frosted six-segment dock and charcoal circular toggles, top-left specular edges, soft shadows, high-contrast labels, serene protective mood, landscape 16:9.
