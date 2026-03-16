# DealFlow SMS Campaign Manager — Deployment Guide

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Seed the database (creates default users and sample data)
npm run db:seed

# 3. Create .env.local file
echo 'NEXTAUTH_SECRET=your-secret-key-change-this' > .env.local
echo 'NEXTAUTH_URL=http://localhost:3000' >> .env.local

# 4. Start the app
npm run dev
```

Open http://localhost:3000

### Default Login Credentials
| User | Username | Password | Role | Timezone |
|------|----------|----------|------|----------|
| Matt | matt | dealflow2024 | admin | Israel (IDT) |
| Hamna | hamna | va2024 | va | Pakistan (PKT) |

You can add more users from **Settings → Users & VAs**.

---

## Deploy for Shared Access

### Option 1: Run on Your Machine + Share via Tunnel (Easiest)

```bash
# Build & start production server
npm run build
npm start

# In another terminal, expose it publicly using ngrok or Cloudflare Tunnel:

# Using ngrok (https://ngrok.com):
ngrok http 3000

# Using Cloudflare Tunnel (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):
cloudflared tunnel --url http://localhost:3000
```

Share the generated URL with your VA. Update `NEXTAUTH_URL` in `.env.local` to match.

### Option 2: Deploy to a VPS (DigitalOcean, Linode, etc.)

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Clone/copy the project
git clone <your-repo-url> sms-campaign-manager
cd sms-campaign-manager

# 4. Install, seed, build
npm install
npm run db:seed
npm run build

# 5. Set environment variables
export NEXTAUTH_SECRET="generate-a-strong-secret-here"
export NEXTAUTH_URL="http://your-server-ip:3000"

# 6. Start with PM2 (keeps it running)
npm install -g pm2
pm2 start npm --name "sms-campaign" -- start
pm2 save
pm2 startup
```

### Option 3: Docker

```bash
# Build the Docker image
docker build -t sms-campaign-manager .

# Run it
docker run -d \
  -p 3000:3000 \
  -e NEXTAUTH_SECRET="your-secret-key" \
  -e NEXTAUTH_URL="http://your-domain:3000" \
  -v sms-data:/app/data \
  --name sms-campaign \
  sms-campaign-manager
```

The `-v sms-data:/app/data` flag persists your SQLite database between container restarts.

### Option 4: Deploy to Vercel (Free)

> Note: SQLite won't work on Vercel's serverless functions. You'd need to swap the database to [Turso](https://turso.tech) (SQLite-compatible cloud DB). For now, use Options 1-3.

---

## App Structure

```
/dashboard       → Analytics with KPIs, charts, date filters
/planner         → Weekly 7-day grid planner with TZ auto-conversion
/campaigns       → Campaign list with status toggles
/campaigns/:id   → Batch table with performance tracking
/settings        → Manage users, counties, states, templates
```

## Key Features

- **Multi-Timezone**: Every user has a timezone — batch times auto-convert for everyone
- **Optimal Time Highlighting**: Green = optimal windows (8-9am, 10am-12pm, 5-7pm), Gold = good
- **Auto Reply Calculation**: Enter conversion rate → replies auto-calculated
- **Weekly Planning**: See the whole week at a glance, duplicate batches between days
- **Analytics**: Filter by date range, see best times/counties/templates

## Database

SQLite database stored at `data/sms-campaign.db`. To reset:

```bash
rm data/sms-campaign.db
npm run db:seed
```

## Security Notes

- Change `NEXTAUTH_SECRET` to a strong random string for production
- Change default passwords after first login (via Settings → Users)
- The app uses JWT sessions (7-day expiry)
