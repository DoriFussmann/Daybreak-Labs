# Blueprint — Design System

The visual language for the app. Adapted from the "Rupert" aesthetic (parchment / ink / brass,
Inter at light weights, editorial restraint) and applied to product surfaces: console, portal,
tables, forms. Follow this exactly for every page. The brand *name and copy* are ours; only the
visual system is borrowed.

## Absolute rules (never break)
- **Light mode only.** Never build a dark mode. The parchment-and-ink feel is load-bearing.
- **Inter, weights 300 / 400 / 500 only. Bold (600+) is forbidden anywhere.** Emphasis = weight 500, color, or size — never bold.
- **No** gradients, glassmorphism, frosted panels, drop-shadow stacks, purple or electric blue, emoji, exclamation marks, countdown-urgency/scarcity language, or AI-forward/hype wording ("AI-powered", "supercharge", "unlock").
- **Icons:** Lucide only, stroke width 1.5, never filled. 20px inline, 24px standalone.
- Uppercase is only for small labels (12px, 0.08em tracking). Everything else is sentence case.

## Color tokens
| Token | Hex | Use |
|---|---|---|
| ink | `#1A1A2E` | headings, primary buttons, logo, key anchors |
| ink-dark | `#11111F` | primary button hover |
| slate | `#4A5568` | secondary buttons, supporting UI |
| brass | `#B5935A` | links, selective highlights, dividers, quote marks |
| parchment | `#FAF9F7` | page background (warm white) |
| white | `#FFFFFF` | cards, panels, inputs |
| smoke | `#E4E2DE` | all borders and ruled lines |
| ash | `#8A8A8A` | meta, captions, labels, timestamps |
| charcoal | `#2D2D2D` | body text |
| sage | `#3A7D5E` | success — sent, reply received, stage complete |
| amber | `#C07C2A` | non-blocking warnings |
| cinnabar | `#C0392B` | destructive actions, validation errors |

## Typography
- Sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif` (300/400/500).
- Mono: `'IBM Plex Mono', 'Courier New', monospace` (400) — metrics, IDs, campaign previews, pipeline data only.
- Scale: display 56/1.1/300 · h1 40/1.2/300 · h2 28/1.3/400 · h3 20/1.4/500 · h4 16/1.5/500 · body 16/1.7/400 · body-sm 14/1.6/400 · label 12/1.4/500 uppercase 0.08em.
- display and h1 use letter-spacing -0.02em. Prose max width 680px. Container max 1160px.

## Spacing & layout
- 8px base. Tokens: 4 xs · 8 sm · 16 md · 24 lg · 40 xl · 64 2xl · 96 3xl.
- Section vertical padding never below 64px desktop / 40px mobile. Nav bar max height 64px.
- Breakpoints: sm 480 · md 768 · lg 1024 · xl 1280.

## Motion
- Hover: 150ms ease opacity/border shifts. Reveal: single fade-up (opacity 0→1, translateY 12→0) 400ms, once.
- No parallax, particles, animated gradients, counters, typing effects. Respect `prefers-reduced-motion`.

## Applying to app surfaces
- Cards: white on parchment, 1px smoke border, ~10px radius, generous padding (24–36px). No heavy shadow.
- Tables: hairline smoke row borders, ash column labels (uppercase 12px), mono for numeric/ID columns.
- Buttons: primary = ink bg + white text (500), hover ink-dark. Secondary/ghost = transparent + smoke border, hover border ink.
- Status: sage / amber / cinnabar as text or 1px-bordered chips, never loud fills.
- Metrics: ash uppercase label above, large light number (34px/300 ink) below.

## Copy voice
Measured, precise, calm. Sentence case. Say what a control does ("Push to Instantly", "Compute and assign").
No exclamation marks, no hype, no "please/simply/just". Errors state what happened and how to fix it.

---

## Code — paste these into the app

### 1. Fonts — `app/layout.tsx`
```tsx
import { Inter, IBM_Plex_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["300","400","500"], variable: "--font-sans" });
const mono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-mono" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### 2. Tokens & base — add to `app/globals.css` (keep the existing Tailwind import line at the very top)
```css
:root{
  --ink:#1A1A2E; --ink-dark:#11111F; --slate:#4A5568; --brass:#B5935A;
  --parchment:#FAF9F7; --white:#FFFFFF; --smoke:#E4E2DE; --ash:#8A8A8A;
  --charcoal:#2D2D2D; --sage:#3A7D5E; --amber:#C07C2A; --cinnabar:#C0392B;
}
html,body{background:var(--parchment);color:var(--charcoal);
  font-family:var(--font-sans),-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;
  font-weight:400;line-height:1.7;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{color:var(--ink);font-weight:300;letter-spacing:-0.02em}
h2{font-weight:400;letter-spacing:0} h3,h4{font-weight:500;letter-spacing:0}
a{color:var(--brass);text-decoration:none;font-weight:500;transition:opacity .15s ease}
a:hover{opacity:.7}
.label{font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ash)}
.mono{font-family:var(--font-mono),monospace}
.btn{height:44px;padding:0 22px;border:none;border-radius:6px;background:var(--ink);color:#fff;
  font-weight:500;font-size:15px;cursor:pointer;transition:background .15s ease}
.btn:hover{background:var(--ink-dark)}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--smoke)}
.btn-ghost:hover{border-color:var(--ink)}
.card{background:var(--white);border:1px solid var(--smoke);border-radius:10px}
.input{width:100%;height:44px;padding:0 14px;background:#fff;border:1px solid var(--smoke);
  border-radius:6px;font-size:16px;color:var(--charcoal);transition:border-color .15s ease}
.input:focus{outline:none;border-color:var(--brass)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
```
