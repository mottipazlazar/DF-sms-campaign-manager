# DealFlow OH — SMS Campaign Manager
## Claude Code Context File

This file is read automatically by Claude Code every session. It contains everything needed to work on this project without re-explaining context.

---

## What This App Is

A full-stack internal tool for **DealFlow OH** (Motti's vacant land business) to manage SMS campaigns sent via **Launch Control (LC)**. It tracks batches, plans weekly sends, and shows analytics.

**Two users:**
- **Motti (admin)** — Israel time (Asia/Jerusalem, IDT/IST)
- **Hamna (VA)** — Pakistan time (Asia/Karachi, PKT)

---

## Project Location

```
/Users/motti/repos/sms-campaign-manager
```

**Always `cd` here before running any command.**

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS + custom brand tokens |
| Database | SQLite via `better-sqlite3`, WAL mode |
| Auth | NextAuth.js v4, credentials provider, JWT |
| Charts | Recharts |
| Fonts | Ethereal (display) + Neue Montreal (body) |

---

## Database

**File:** `data/sms-campaign.db`
**Init:** `src/lib/db.ts` — auto-creates tables on first run

### Tables

```sql
users        -- id, username, password_hash, display_name, role(admin|va), timezone, tz_label
campaigns    -- id, name, county, state, status(Planned|InProgress|Done)
batches      -- id, campaign_id, batch_number, lc_batch_id, template, message_count,
             --   owner_id, local_target_time, actual_send_time, conversion_rate,
             --   reply_count, planned_date, sort_order, notes
settings     -- id, key, value, category(county|state|template|general)
```

### Settings data model
- **county** entries: `key = county name`, `value = state abbreviation` (e.g. key="Licking", value="OH")
- **template** entries: `key = display name`, `value = LC template string`

---

## Brand Tokens (Tailwind)

```
brand-pine    #3F6B55   primary buttons, nav, sidebar
brand-taupe   #635752   secondary text, labels
brand-gold    #E5A94D   accents, highlights, optimal time slots
brand-ivory   #F6F4E3   card backgrounds
brand-lemon   #FFFEF6   page backgrounds (warm white)
```

---

## App Structure

```
src/
  app/
    (authenticated)/        ← requires login (middleware protected)
      layout.tsx            ← sidebar + header shell
      dashboard/            ← analytics KPIs + charts
      campaigns/            ← campaign list + create
      planner/              ← weekly time-grid planner (main feature)
      settings/             ← admin CRUD: users, locations, templates
    login/                  ← public login page
    api/
      auth/[...nextauth]/   ← NextAuth config
      batches/              ← GET, POST, PATCH, DELETE
      campaigns/            ← GET, POST, PATCH, DELETE
      analytics/            ← aggregated stats
      settings/             ← GET, POST, PATCH, DELETE
      users/                ← GET, POST, PATCH, DELETE
  lib/
    db.ts                   ← SQLite singleton + schema init
    auth.ts                 ← NextAuth credentials provider
```

---

## Key Features & Current State

### Weekly Planner (`/planner`)
- Time-grid: rows = hours (6am–9pm), columns = 7 days
- Batch cards show: status, time, quality dot, campaign, template, volume, owner, TZ conversions per user
- **Drag & drop** to move batches between cells
- **Multiple cards per hour slot** — all show full card info, rows expand naturally
- **Quality indicator:** Optimal (8–9am, 10–12pm, 5–7pm), Good (9–10am, 12–2pm, 4–5pm), Neutral otherwise — based on county LOCAL time
- **TZ Converter widget** in header: bidirectional (my TZ ↔ county local), swap button, quality badge tracks county side always
- **Actions per card:** ✅ Mark Done | ✏️ Edit | 📋 Duplicate | 🗑️ Delete
- **Edit modal:** pre-filled form, quality indicator, TZ preview, saves via PATCH
- **Done modal:** enter LC batch ID + conversion rate → shows reply count, fires dashboard refresh via localStorage

### Campaigns (`/campaigns`)
- Location dropdown shows "County, ST" pairs — auto-fills county + state from settings
- Auto-suggests campaign name from selected location

### Settings (`/settings`)
- Tabs: Users & VAs | Locations | Templates
- Inline edit for locations (county + state dropdown) and templates
- Custom timezone support: select "+ Custom timezone..." → enter IANA ID + label
- Password visibility toggle on user forms
- Delete blocked (409) if user/template is in use by batches

### Analytics Dashboard (`/dashboard`)
- KPI cards, Recharts charts
- Refreshes when planner fires `localStorage.setItem('dashboard_refresh', ...)`

---

## Time Zone Logic

```ts
// STATE_TZ_MAP: state abbreviation → IANA timezone
// convertTimeSimple(localTime, plannedDate, targetTz): converts county local time to user's TZ
// getTimeQuality(localTime, state): returns 'Optimal' | 'Good' | 'Neutral'
// formatHour(h): 9 → '9am', 13 → '1pm'
```

All TZ conversion is client-side using `Intl.DateTimeFormat` offset math. ET used as pivot.

---

## Dev Commands

```bash
npm run dev        # start dev server on localhost:3000
npm run build      # production build
npm start          # run production build
npm run db:seed    # seed DB with sample data
```

---

## Git & GitHub

- **Remote:** `git@github.com:mottipazlazar/DF-sms-campaign-manager.git`
- **Branch:** `master`
- **Push:** `git push origin master`
- SSH key is configured — no password needed

---

## Deployment (Planned)

- Target: Railway or Render (~$5/mo)
- DB migration needed: SQLite → Turso (SQLite-compatible, persistent in cloud)
- Custom domain: TBD (Motti to confirm domain registrar)
- VA access via subdomain e.g. `app.dealflowoh.com`

---

## Pending / Known Issues

- [ ] Allow updating conversion rate on already-Done batch cards (use case: rate changes days later)
- [ ] DB migration to Turso for cloud deployment
- [ ] Push to GitHub + set up Railway deploy pipeline

---

## Notes

- Never hardcode user names or timezones — always pull from `users` table
- Settings `county` category stores paired location data: `key=countyName, value=stateAbbr`
- `reply_count` is computed: `message_count * (conversion_rate / 100)`
- Dashboard refresh is triggered via `localStorage.setItem('dashboard_refresh', Date.now())`
