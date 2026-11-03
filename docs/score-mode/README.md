# Score Mode brainstorm

Open `index.html` in a browser for the clickable wireframe (simulated scores on the real Nov 2–3, 2026 slate), the live Game Pulse table and the infrastructure diagram. This file is the short version.

## Ground truth today

- `api/scores.js`: 12 ESPN leagues, one Vercel function, CDN cached `s-maxage=180`. Returns score, status, clock string, pre-game line.
- ESPN's scoreboard also returns `status.period`, `status.clock` (seconds), team `color`, `records` and live `situation` (possession, red zone). `trimEvent` drops them.
- ESPN and Sleeper both send `Access-Control-Allow-Origin: *` (checked 2026-11-02).
- ESPN `summary` (box score, scoring plays, win probability) is ~600 KB per game, so trim it server-side before the browser sees it.

## Add or replace?

- **Click opens a small menu**: Watch now, Add to layout, Replace tile N, Pin score card, Follow team.
- **Watch now promotes the game without deleting anything.** The new game becomes main, the old main moves to slot 2, and something drops off only when the layout is full. The toast offers Undo.
- **Dragging onto a tile replaces that tile.** Dragging a game that is already on screen swaps the two tiles.
- Shortcuts: `Enter` watches now, `Shift+Enter` adds, `P` pins a card, and double-clicking a row watches it.
- `handleMakeMain` and CSS `order` already let us promote without reloading iframes.

## Features

| Tier | Feature | Runs on |
| --- | --- | --- |
| Now | Scoreboard drawer (sorted by Pulse, Live / All / Following, freezes order while hovered) | browser |
| Now | Score cards: score-only PiP, reusing `usePipWindow` with the aspect ratio as a parameter | browser |
| Now | Score bugs on tiles | browser |
| Now | Bottom ticker for fullscreen | browser |
| Now | Game Pulse relevance score | browser |
| Now | Spoiler shield: hide on-screen scores, or delay them N seconds | browser |
| Now | Smart layouts that store rules (team, hottest in league), not embed URLs | localStorage |
| Now | Share a setup link (layout rules in the URL hash) | browser |
| Next | Close-game alerts: toast plus Notification API while the tab is open | browser |
| Next | Auto-director: main follows the hottest game, with a gap threshold, cooldown, lock and undo | browser |
| Next | Game detail panel: box score, leaders, win-probability sparkline | `/api/game?id=`, CDN 60 s |
| Next | "What you missed" scoring plays when switching games | same |
| Next | Auto-join followed teams, plus an .ics "Remind me" | browser |
| Next | Tonight timeline for planning overlaps | browser |
| Next | Fantasy overlay via Sleeper username | browser + daily player map |
| Dream | Phone as remote (QR pairing) | Supabase Realtime |
| Dream | Watch rooms: shared layout, reactions only | Supabase Realtime |
| Dream | Push alerts with the tab closed | Supabase pg_cron + edge function |

## Game Pulse

```
close = max(0, 1 − |margin| / scale)      scale: NFL 17, NBA 15, NHL 3, soccer 3
late  = share of regulation played (1 in OT)
base  = close × (0.35 + 0.65 × late)
bonus = +0.15 underdog leading after half, +0.20 OT, +0.10 red zone / power play,
        +0.25 followed team, +0.05 per fantasy starter (max 0.15)
pulse = min(100, round(100 × (base + bonus)))
pre-game: 10 inside 15 min of start, +25 if followed. final: 0
```

## Fantasy

1. **Sleeper**: username only, public read API, no auth. Build this first.
2. **ESPN**: public league ID only. Never ask for `espn_s2`/`SWID` cookies.
3. **Yahoo**: needs OAuth and stored refresh tokens, so it waits for accounts.
4. **Manual watchlist** as a fallback for any platform.

Sleeper player records carry ESPN IDs, which map rosters onto ESPN box scores. The player list is ~5 MB, so trim it daily.

## Accounts and infrastructure

- **Phase 0 (now, $0)**: one versioned `streambuddy.profile` JSON in localStorage holding follows, smart layouts, prefs and fantasy links. Add export/import and share links.
- **Phase 1 (accounts, $0)**: Supabase Auth (magic link, Google) and one `profiles(user_id, doc jsonb, updated_at)` row per user with RLS. The browser talks to Supabase directly, so there are no Vercel functions. On sign-in, merge: union the follows, newer layout wins per name, newer `updatedAt` wins for prefs. Free projects pause after a week idle; Pro is $25/mo.
- **Phase 2**: Realtime channels for the phone remote and watch rooms.
- **Phase 3**: pg_cron + edge function for push alerts. This is the first real compute spend, and Vercel Hobby cron is daily-only.

Cost drivers: `/api/scores` refreshes per CDN region, not per user. That's ≤ 480 runs/day per region at 180 s, or ≤ 2,880 at 30 s. Add a `?fast=1` variant and poll it only while score UI is visible.

## API additions to `trimEvent`

`period`, `clockSec`, `teams[].color`, `teams[].record`, live `situation` (possession, down & distance, red zone), `favorite` parsed from the line, and more leagues (NCAAF, NCAAB, UCL, MLB in season).

## Build order

1. Feed fields + `gamePulse.js` with tests
2. Scoreboard drawer with watch/add/replace/drag/undo
3. Score cards, bugs, ticker
4. Local profile: follows, smart layouts, share link
5. Alerts, then auto-director
6. `/api/game` detail + "what you missed"
7. Accounts syncing the same profile doc
8. Sleeper fantasy
9. Remote, rooms, push (only if wanted)
