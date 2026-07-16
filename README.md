# Mia's link-in-bio — LIVE (canonical)

This is the **live** link-in-bio that Mia puts in her social bios.

- Live URL: https://mia-links.vercel.app
- Deploys: GitHub `din77225/mia-links` (branch `main`) → Vercel auto-deploys on push.
- **Edit THIS project.** There is an older duplicate at
  `Mia's AI Agent/projects/website/meow-web/public/links/` — do NOT edit that copy.

## Pages
- `index.html` — the link-in-bio page
- `flow-prompt/index.html` — free Google Omni Flash prompt giveaway (served at `/flow-prompt/`)
- `api/latest-video` — serverless function that fills the video thumbnails + live subscriber
  count. It needs a YouTube API key env var set in the Vercel project settings; if that's
  missing the page still renders but with placeholder thumbnails + the hardcoded sub count.

## To publish changes
    git add -A && git commit -m "..." && git push
Vercel builds `main` automatically on push.
