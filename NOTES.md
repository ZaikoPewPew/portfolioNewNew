# Portfolio — context for the next session

## Decisions
- Style reference: **only voiceos.com** (airy, rounded, massive, micro-animations, sounds).
- Structure reference: Figma page https://www.figma.com/design/vZkzNf4apQLFKJRf8s0NCp/?node-id=1139-19139
  (Hello [company] / Let's work together → statements + case carousel → photo fan → own products → concepts bento → community carousel → footer).
- Nav: VoiceOS-style liquid-glass notch (own implementation: backdrop blur + SVG displacement `filter` with chromatic split, notch clip-path, rim/bevel SVG, collapses on scroll). Refraction works in Chromium only.
- Light / dark theme toggle (saved in localStorage). No other theme variants.
- Font: Styrene A LC Regular self-hosted as `assets/fonts/styrene-a-lc-regular.woff2` (@font-face in every page / case.css; desktop licence only — Vlad accepted the risk 2026-10-01). Mono: DM Mono.
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
- Exported to `assets/`: `case-qr.webp`, `photo-1…5.png` (pre-rotated with white frames, transparent), `product-ies.webp`, `product-obratka.png`, `product-tippy.png`.
- Enriched: experience chips under the intro, case metrics/links, ies stats, extra community posts (2 known videos, ies build-in-public), footer contacts (LinkedIn/Telegram/YouTube/copy email instead of Twitter/Instagram).

## Next step
- Figma only has the QR phone screen — need screens for the other 3 cases (currently CSS mock phones).
- Concepts bento is empty in Figma — needs real concept shots.
- Community posts from Figma have no URLs (Figma Master Plugin, vc.ru Whiteboard Challenge, Vibecoding, Jarvis) — they link to channels for now; vc.ru card isn't clickable.
- "time travel" description in Figma was a placeholder (copy of obratka) — wrote "Flip-clock widget", verify.

## Data (from Notion export)
- Vladislav Kurguzov, Sr. Product Designer at Alfa-Bank (site MAU 22M+ — 22.4M peak, see Alfa-Bank raw data below; Notion said 10M+). 5 years. Pavlodar / Almaty.
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

## Case pages (2026-09-30)
- `cases/<slug>.html` — password-gated case pages (password `123456`). Text and images are AES-GCM encrypted (PBKDF2-SHA256, WebCrypto); unreadable in page source. Correct password is kept in sessionStorage for the tab.
- Plaintext sources live in `cases/_src/<slug>/case.html` + `img/` — **gitignored**, exist only on this Mac.
- New case: `node tools/encrypt-case.mjs new <slug>` → fill → `node tools/encrypt-case.mjs <slug>` (optional `--password`).
- Blocks (see `tools/case-template.html`): hero, stats, company card, text section, big statement, numbered list, image, gallery, bars, numbers in two columns.
- Shell: `tools/case-shell.html`; styles `cases/case.css`; gate `cases/lock.js`; contents + player `cases/case-ui.js`.
- Layout (v2): no cover — the page opens straight with tags (glass), title, lead, numbers. Everything sits in one fixed 720px column; sizes toned down (h1 ≤44px, body 17px).
- Contents always visible: glass rail left of the column (≥1220px) with scroll-spy + progress; below that a bottom dock (current section + progress) that opens a sheet. Built from `.c-sec .c-label`.
- Voice-over: glass pill in the nav left of the theme button — play + track only, no text. `<audio class="c-voice" src="audio/voice.m4a">` in the case source (encrypted too). Without it the pill is dimmed, tooltip «Voice-over is coming soon».
- Images: click → lightbox (fit to screen; click / zoom button → real size with scroll; ← → between images; Esc closes). Export wide flows large — they're studied in the lightbox.
- QR case filled from the Notion export (images → webp, 15 MB → 0.9 MB); home card links to `cases/qr.html`.
- Notion images: pull via the public notion.site API (`/api/v3/loadCachedPageChunkV2` + `syncRecordValuesMain` with a browser UA; the MCP's signed S3 links expire in 5 min), convert to webp.

## Case template v2 (2026-10-01)
- Refs for cases: Medium article layout + voiceos.com/blog. No glass, blur or shadows in cases — flat `--panel #F0F2F6` cards, text `#111827` + gray shades, Styrene 400 only.
- Theme: no toggle in cases — inherited from the home page (`localStorage.theme`), else follows the system live.
- Layout: sticky rail on the left (≥1200px: "All work" + contents with scroll-spy/progress), article grid with a 680px text column; `.c-fig.wide` spans the whole article. <1200px: top bar (back · current section · progress, hides on scroll down) + contents bottom sheet.
- Hero gets "N min read" (injected by case-ui.js). Voice-over (2026-10-01): no player — the glass Listen button top right just plays / pauses at 1.5×, desktop and mobile. Scripts for ElevenLabs: `cases/_src/<slug>/voice.md`; audio → `cases/_src/<slug>/audio/voice.m4a` (afconvert to 64 kbps mono AAC) + uncomment the `<audio class="c-voice">` line. Done: qr, balance; waiting: ios, desops.
- Prefooter: previous / next case, cyclic, order + titles in `cases/cases.js` (keep in sync with the home carousel). Shell gets the slug via `{{SLUG}}` in encrypt-case.mjs.
- Data blocks play once on scroll: count-up numbers (stats, nums, company card), `.c-bars`, new `.c-shift` (before → after) and `.c-cols` (vertical columns). Real numbers only.
- Pilot: QR (wide figures, 9 → 3 shift, +8% → +17% columns). Other cases rebuilt with the new shell but their sources aren't enriched yet.
- 2026-10-01: cases use only Styrene A LC (DM Mono dropped from the case shell); no visible "Contents" heading, prev/next cards show arrows only; the bar shows the case title before the first section.
- 2026-10-01 (round 2): one centred 720px column for everything (no wide breakouts — images stay inside), contents rail in the left margin from 1280px; more air (block gap ~44px, 128px before a section, h2 32px, body line-height 1.7, card padding 32px); dotted dividers (`--dots`, same as the home footer); Listen is a bare play-circle icon; back button "Go back" in the home glass material; scroll-spy line slides to the bottom on the last screen so no section is skipped, rail progress follows the active item.
- 2026-10-01 (round 3): solid 1px dividers again (dotted reverted); no panel wrappers around content blocks — stats, company, before→after, columns, prev/next are built on dividers, grid and spacing only (panels stay only on floating UI: player, lightbox bar, lock cells); tags and research labels are grey chips (`.c-meta` / `.c-chips`), no "·" separators; active menu item and progress lines use the brand red #E23336.
- 2026-10-01 (round 4): case footer = the home page footer (dotted line, krgzv.net © 2026 → home, contacts, copy email + toast), full 1216px width under the article. Charts use one accent — brand red #E23336 (.acc bars/columns, kept screens in .c-shift; .bad = red tint). CV links point to the Google Drive PDF (2026-10-02, outdated — refresh later).
- 2026-10-01 (round 5): prev/next is its own full-width (1216px) glass widget between the article and the footer; Listen + theme toggle are glass buttons in the top-right corner (mirrored against Go back; on narrow screens they sit in the top bar and hide with it); read-time row dropped; dividers only between items (lists use li+li, before→after has no lines) so two lines never stack; chips 36px tall with 16px side padding. Shared `.glass` class in case.css = home pill recipe.
- 2026-10-01 (round 6): article starts at 28px so hero chips line up with Go back / Listen / theme; all chips 44px (= button size). One divider above the key numbers; `--div` = the same air above and below every divider. Bars redesigned: label + value on a line, an 8px bar below (text never sits on the fill; .acc red, .bad red tint). Company row: numbers (MAU, Rating) + product links (App Store, Google Play, Website — `.c-links`, links found via web search). 1px `--panel` border on every image.
- 2026-10-01 (round 7): product links sit under the company logo + text (above the numbers row); 40px between hero chips and the title; contents rail starts level with the title (rail gap 40px → both at 112px).
- 2026-10-01 (round 8): password screen is solid --bg (case UI hidden via html.locked); close button and the 6 code cells are glass (dot = inner <i>); close sits where the top-right tools are. Esc on the password screen goes back to the home page (already in lock.js). Content was already safe: text and images are AES-encrypted, so removing the modal in devtools shows an empty page.
- 2026-10-01 (round 9): case pages link case.css / cases.js / case-ui.js / lock.js with ?v=<content hash> (added by encrypt-case.mjs) — rebuild the cases after editing those files so browsers drop the cached copies. Home contacts menu ordered by reply speed: Telegram (within 20 minutes), LinkedIn (within a day), Email (within a week), CV. No "·" separators anywhere (time-travel caption uses —).

## Mobile pass (2026-10-01)
- Phones (≤560px): case cards are `100vw − 48px` wide, 3:4; title starts below the lock (68px), pills wrap (36px / 14px), phone at 52% and cropped at the bottom.
- Touch devices: product tiles (ies, obratka, time travel, tippy) play their hover animation once per page load, when the tile is 60% in view (`onView` → `.pcard.on`). Time-travel copy switches from "hover" wording on touch.
- Phones: blog list shows only the 4 latest posts.
- Footer ≤640px (home + cases): centred — links row, email on its own line, © last; "Contacts:" hidden.
- Phones (≤640px): avatar sits 120px under the 70px nav (`#work.sec` padding-top 162px).

## SEO / release (2026-10-02)
- Root: `robots.txt` (blocks /lab/ /tools/ /about/; cases stay crawlable so LinkedIn/Telegram can read their OG, the pages carry noindex), `sitemap.xml` (home only), `404.html` (home style: star logo, statement, glass pill; a <base> set by script resolves links from the site root on both krgzv.net and *.github.io/<repo>/ — so the star is inline SVG, not <use href="#">), `favicon.ico` / `favicon.svg` / `apple-touch-icon.png` (the red star).
- Home head: canonical, og:site_name, twitter:title/description/image, JSON-LD Person (sameAs LinkedIn, YouTube, Telegram), `theme-color` synced to the theme by a MutationObserver in the boot script. The «I'm Vlad» statement is the page's `<h1>` (same look).
- Cases: title / description / OG line per case in `tools/case-meta.json`; `encrypt-case.mjs` fills `{{TITLE}}` `{{DESC}}` in the shell. OG images `assets/og/<slug>.png` are rendered from `tools/og.html?t=<title>&d=<line, *accent*>` in headless Chrome at 1200×630.
- After deploy: add the site to Google Search Console and Yandex Webmaster, submit the sitemap. Hosting not chosen yet — make sure lab/, tools/ aren't deployed at all.
- 2026-10-02: tab title «Vladislav Kurguzov — Senior Product Designer»; the first statement (h1) is fully lit from the start (no word fill, the rise-in stays), «Alfa-Bank» never breaks at the hyphen; nav logo and footer star (`data-home`) do a full reload of the home page from the top (relative `./`, so it works on github.io and on the custom domain); footer star turns 90° on every hover of a footer link (spring). 404 subtitle 18px.
- 2026-10-02: «Work with me» faces are Vlad's own photos (`assets/me/1-3.webp`, 120px face crops; the 4th was dropped) instead of the colleagues; line under it «slide into my DMs — let’s cook» (was «and 100+ other colleagues»).

## Alfa-Bank cases — raw data (2026-10-02)
Source: slides from the demo of the Site Development & Primary Sales Platform Directorate + Online Sales Department, 29.09.26.
- Site unique users: 22.4M per month (max), 161M per calendar year (Russia's population is 146.12M).
- Site visits: 43M per month (max), 419M per calendar year; ×2.6 visits per unique user.
- New-to-bank clients acquired via online sales + site, 2024–2026: Retail 11M, SMB (ММБ) 0.5M, Corporate (СКБ) 12K.
- Forecast N2B for 2026: Retail 2,823,655, SMB 150,639, Corporate 4,452.
- Share of acquired clients in the active base (АКБ), Aug 2026: Retail 37%, SMB 18%, Corporate 15% (of all new-client acquisition in the bank).
- >50B ₽ profit per year Alfa-Bank earns from clients acquired via online sales and the site.
- Alfa-Bank MAU to use on the site: **22M+** (site alone, peak month). Goes into the company block of the Alfa cases (MAU / visits per year 419M).

## Terminals case (2026-10-02)
- `cases/terminals.html` — Alfa-Bank merchant acquiring: 2-year business vs brand stand-off (real photos vs 3D guidelines) → hyper-real 3D → terminal showcase + comparison table + 30-second quiz. First card in the home carousel and first in `cases/cases.js`; home card image `assets/case-terminals.webp` (the new mPOS render).
- Source: Notion «Терминалы: от двухлетнего спора к витрине» (Продуктовые кейсы) — Russian draft with open ❓ questions. `cases/_src/terminals/raw/` = originals from Notion, `img/` = webp.
- Still missing: hard numbers (showcase traffic, CTR from the block, quiz completion → application, sales trend), 2026 research format / respondent count, quiz screens, team and exact dates. Stats row now uses 2+ yrs / 3 → 0 / 30 s.
- New case blocks (in case.css / case-ui.js / case-template.html): `.c-quote` (user quote, red line, role in <cite>, no names), `.c-table` (row dividers only; phones hide the middle column), `.c-ba` before / after slider (drag or ← →, sways once on first view, tags «before» / «after»).
- 2026-10-02: CR1 (= first step of the application form: call-back request or online sign-up) 4.39% → 6.06% over Q2 2026 after the end-of-Q1 release (+1.7 pp, +38%); 2026 research = moderated usability on the live site, 10 SME owners in 3 groups. The quiz («Смешарик», tariff or terminal matcher) shipped in 2025 and was embedded into the showcase later.
- Video in cases: `encrypt-case.mjs` now encrypts `<video src>` too (mp4 / webm), `lock.js` decrypts it into a blob, `case-ui.js` plays it only while on screen. Write `width` / `height` on the tag (not read from the file), keep `muted loop playsinline`. Compress first: `ffmpeg -an -vf fps=30 -c:v libx264 -preset veryslow -crf 30 -pix_fmt yuv420p -movflags +faststart` (quiz: 1.2 MB → 257 KB).
- `.c-pair` = two phone screens side by side, max 260px each (lightbox for full size).

## Support case (2026-10-02)
- `cases/support.html` — «When 30% of sales leads are support calls»: ~300 of ~1,000 acquiring form applications were existing clients wanting support (call centre can't help or transfer). Decisions: clickable Support 24/7 benefit tile → numbers + QR window; form tabs Connect / Support 24/7; argued for phone numbers only (no knowledge base / bot links); root cause (welcome email, internet bank) passed to other teams; welcome page draft not sold. Second card on the home carousel, second in `cases/cases.js`; card image `assets/case-support.webp`.
- NOT shipped yet: rolling out to 100% (no A/B). When numbers arrive: support share 30% → X%, banner window opens, CR1 holds → update the «Rolling out» chip, `.c-stats` and the Status section. Source + questions: Notion «Форма заявки: 30% обращений не по адресу».

## Plugin case (2026-10-02)
- `cases/plugin.html` — «One designer, one plugin, every designer on the site»: Vlad's own Figma master plugin (design + code, ~1 day a week): Assembly / Fitting (~1 h → 1 click), Typographer (editorial policy), AI page generation from a layered knowledge base (Planning → Registry → Knowledge → Constraints → Reference → Build Plan → Figma Builder). 30+ designers = 100% of the site team; shown at Alfa's design meetup (300+ online); he set up the vibe-coding & AI competence centre. Videos: `img/assembly.mp4` (Fitting + Assembly), `img/ai.mp4` (2× speed, throwaway test design). Third card on the home carousel; card image `assets/case-plugin.webp` in a wider `.device.device-wide`.
- Reviews: only the 3 real quotes from colleagues. Never write reviews on Vlad's behalf.
- 2026-10-03: legacy iOS, Balance and DesOps (Home Credit) cases deleted from the project (pages, media, OG, meta, calendar script). Line-up: terminals, calculator, plugin, support, QR.
- 2026-10-02: plugin case «What it saves» — estimate at ₽250K/month (≈₽1,560/h; Habr Career avg 219K, senior 280K, Alfa senior vacancy from ~249K): one assembly ≈ ₽1,000–1,500; 10–30 layouts/week × 40 min = 7–20 h/week ≈ 330–1,000 h ≈ ₽0.5–1.6M (shown as $6–19K at ~₽83/$, $12–18 per assembly) a year. New block `.c-calc` (chain of steps, result line in red).
- 2026-10-02: new blocks `.c-dots` (support: 15 of 50 call-backs) and `.c-time` (terminals: 2024 research → Q2 2026 CR1, before Results). Timeline dates = only what Vlad confirmed; «2025 renders» is inferred (between early 2025 and the Q1 2026 release).

## Calculator case (2026-10-03)
- `cases/calculator.html` — «Testing a new tariff calculator inside the real page in two days»: Figma Make prototype → Cursor → GitHub Pages → the site's iframe widget on an unpublished page; research on it (8 respondents, none noticed the embed, 12 hypotheses); redesign (one card format, cards swap places on recalculation, commission in steps like a receipt, industry search + «Other industry», instant crediting moved down); A/B win. Third card on the home carousel (after support), third in `cases/cases.js`; card image `assets/case-calculator.webp`.
- Source: Notion «Калькулятор тарифов: прототип внутри страницы за 2 дня» (EN site text at the top, raw answers below). Images pulled through `kvneasy.notion.site/image/<s3 url>?table=block&id=<block>` (public page, no signed links needed).
- Built with no `data-nda` fragments → `lock.js` now removes the code screen when an open case hides nothing. One shared code for every hidden fragment on the site (the default in encrypt-case.mjs); opening it once opens all cases. All cases rebuilt 2026-10-03.
- Timeline (Vlad, 2026-10-03): research 9 Apr – 21 May 2026 on the prototype; his work 21 May – end of June (findings → options → defended → approved); end of Q2 handoff (cases, prototype, code snippets) + analytics, design checks, designers' working group; Q3 development.
- A/B: +13.7% CR1 vs the old calculator (the +5% Vlad first gave was the picker bot, another feature) (Vlad, 2026-10-03) — in stats, Results, home card pill, llms.txt, OG. Date / duration / absolute CR1 unknown (absolutes would go under data-nda). Still missing: card-swap video.
- New block `.c-states` (case.css / case-ui.js): one framed screenshot + chips on top (`data-label`), caption from `data-cap`; crossfades on its own every 3.2 s while ≥50% in view, stops for good on a chip click / arrow key / swipe, pauses on hover. Images must share one aspect ratio. Used in the calculator case for steps / industry / loading / error.
- 2026-10-03: line-up (home carousel, cases.js, llms.txt) = terminals, calculator, plugin, support, qr. The first card sits in the centre on load; calculator peeks on the right, qr on the left. Support moved down while it has no results.
- `.c-states.fit` + `style="--ar:1.5"`: images of different proportions share one frame (object-fit: contain). Terminals case: acquiring block / showcase / comparison now switch in one frame; the phone pair stays below.
- 2026-10-03: new block `.c-phones` (case.css / case-ui.js) for phone mockups — transparent PNGs in a device frame on a stage in the home case-card glass (`.slide` recipe ported as `--sl-*` in case.css; radius 40px, 28px on phones). A row by default (≤180px each); `.roll` = carousel for long flows: native scroll + snap, mouse drag (never opens the lightbox); under the stage a glass dots pill (left) + glass round arrows (right) like the home carousel controls — dots jump to a screen, arrows step two phones. QR case: old flow (10 mockups) in `.roll`, new flow and heatmaps in plain rows; images 600px webp (~430 KB for 15). Sources: ~/Downloads/QR.
- 2026-10-03: prev / next cards — arrow and title on one line, the title is cut with «…» (no wrapping, desktop and phones); chips stay below on desktop.
- 2026-10-03: every media frame in cases is the home case-card glass (radius 40px, 28px on phones; pairs 28 / 20px): `.c-frame` (wraps the <img>/<video> of a plain `figure.c-fig` — write `<figure class="c-fig"><div class="c-frame"><img…></div>…`), `.c-states .c-fig`, `.c-pair .c-fig`, `.ba-box`, `.c-phones>.c-fig`. Media inside a frame has no own border / radius / fill. All case sources + tools/case-template.html converted.
- 2026-10-03: lightbox toolbar = separate glass buttons (prev, counter pill, next, zoom, close) at the Listen / theme spot; close sits where the theme button is.
