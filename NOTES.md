# Portfolio — context for the next session

## Decisions
- Style reference: **only voiceos.com** (airy, rounded, massive, micro-animations, sounds).
- Structure reference: Figma page https://www.figma.com/design/vZkzNf4apQLFKJRf8s0NCp/?node-id=1139-19139
  (Hello [company] / Let's work together → statements + case carousel → photo fan → own products → concepts bento → community carousel → footer).
- Nav: VoiceOS-style liquid-glass notch (own implementation: backdrop blur + SVG displacement `filter` with chromatic split, notch clip-path, rim/bevel SVG, collapses on scroll). Refraction works in Chromium only.
- Light / dark theme toggle (saved in localStorage). No other theme variants.
- Font: Styrene A LC (installed locally; needs woff2 + license for publishing). Mono: DM Mono.
- Sounds: synthesized with WebAudio (tick / click / flip / pop). Can be swapped for Soundly files.
- Hero «Hello [company]» removed (2026-09-30) — page starts with the «I'm Vlad» statement; `?to=` greeting no longer exists.
- Under the statement: «Open to work» glass pill (CSS recipe copied from voiceos.com «Download for Mac» `.glassmorphic-button`, green live dot). Click fires the burst (chips / emoji / speech bubbles) that used to live on the Alfa logo.
- Glass material (2026-09-30): tokens `--gb-*` on :root (dark set muted). Used by pills (.gb: Open to work, Work with me), play buttons, slider dots/arrows, case cards, product tiles, concept tiles, testimonial cards (`--sl-*`), photo rings.
- Photo rings: `assets/photo-N-ring.png` / `-rim.png` generated from photo alpha (+20px @2x = 10px, canvas padded 24px) with CoreImage — script in scratchpad `rings.swift` (CIMorphologyMaximum/Minimum).
- Sliders switch silently (no sounds on auto-advance, arrows, dots, swipe, hover over slides).
- Product tiles: desktop hover UIs — ies streak push + badge, obratka review pins + cursor, tippy answer typing under the island.
- All text is Regular (400) — never another weight unless asked.
- Copy is in English.

## Done (2026-09-30)
- `index.html` rebuilt from Figma frame `Desktop` (1139:19139) via TalkToFigma: white minimal hero with stickers, grey/ink scroll-lit statements (40px), 700×600 r=60 case cards + synced case info, photo fan, 4 products (ies, obratka, time travel, tippy), concepts bento, community carousel in a panel, dotted footer.
- Exported to `assets/`: `sticker-scarf.png`, `sticker-sleepy.png`, `logo-alfa.png`, `case-qr.png`, `photo-1…5.png` (pre-rotated with white frames, transparent), `product-ies.png`, `product-obratka.png`, `product-tippy.png`.
- Enriched: experience chips under the intro, case metrics/links, ies stats, extra community posts (2 known videos, ies build-in-public), footer contacts (LinkedIn/Telegram/YouTube/copy email instead of Twitter/Instagram).

## Next step
- Figma only has the QR phone screen — need screens for the other 3 cases (currently CSS mock phones).
- Concepts bento is empty in Figma — needs real concept shots.
- Community posts from Figma have no URLs (Figma Master Plugin, vc.ru Whiteboard Challenge, Vibecoding, Jarvis) — they link to channels for now; vc.ru card isn't clickable.
- "time travel" description in Figma was a placeholder (copy of obratka) — wrote "Flip-clock widget", verify.

## Data (from Notion export)
- Vladislav Kurguzov, Sr. Product Designer at Alfa-Bank (MAU 10M+). 5 years. Pavlodar / Almaty.
- Experience: Alfa-Bank (2024–now), red_mad_robot CA — PD/DesOps (2024), Zimran.io (2023–24), Kcell (2022–23), Alfa-Bank KZ (2021–22).
- Cases (Notion links in index.html):
  - QR transport payment (2022): −50% flow steps, −20 s avg payment time, +17% users paying in app.
  - Mobile balance home screen (2022–23): +5% balance payments, +1840 bonus accounts in a month.
  - iOS app in a month (EdTech, 2023).
  - DesOps & design system (HCB Business, 2024).
- Products: Иэс — Chechen Duolingo (tens of thousands of users, hundreds of reviews, TG @ies_app 1.8k); Figma plugins/widgets.
- Community: YouTube @DesignLeadd 22k+ (videos vErruWMXBEg 37k, maePy1m5hmk 12k); TG @dsgn_thinking 1.1k.
- Contacts: t.me/ezzzz12345, linkedin.com/in/kvneasy, kvneasyy@gmail.com.

## To verify with Vlad
- "10K+ learners" / "100s reviews" for Иэс; company attribution of cases; translated video titles.
- Photos for the fan, case screens, concepts, stickers.

## Wall of Love
- Testimonials live in the `TESTIMONIALS` array in index.html — all 6 are placeholders (`todo:true`). Need real quotes: name, role, text, optional photo.
- LinkedIn profile (Profile.pdf): Alfa-Bank senior PD since Sep 2024 (Moscow), publications added to the blog carousel (link to LinkedIn articles list).

## Product tiles (2026-09-30, ported from Vlad's repos)
- time travel ← github.com/ZaikoPewPew/time-travel-site (app.js/sky.js): glass split-flap cards, per-digit pace scramble → lock-in pulse, per-letter caption, warp starfield; flip click = `assets/flip.wav` from the repo. Travel shortened to 2.6 s for hover.
- obratka ← github.com/ZaikoPewPew/obratka: card = repo's `.home-screen__card` rebuilt from its tokens (px × --s scale): preview with browser bar, person pill (platform + avatar badges, grade), progress pill with 3 reviewer slots. Hover: slots fill at once (empty + → reviewing → photo), then a short rain of ducks (`assets/duck.svg` = repo's bone.svg balance icon) passes through. Fake avatars via unavatar.io/github/*.
- tippy ← github.com/ZaikoPewPew/pomoshnik: island (glass character + audio glyph + dictation ticker + loader), no extra layout below. Hover: ticker words → loader → character leaves as a cursor, clicks 3 spots (ripples), returns, loops.
- Product tiles fade to transparent at the bottom, no shadow. Blog panel (.cbox) uses the shared glass.
- time travel tile: solid black in light theme (no fade); fades out only in dark theme.
- ies push: pill hugging its text, centred, 16px from the top, drops in from the top centre.
- No hover lift on tiles/cards — the animation lives inside the blocks. tippy island centred in the tile; ticker drops below it.
