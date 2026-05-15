# ScanIt — Barcode & QR Code Scanner

A mobile-first web application that uses the device camera to scan barcodes and QR codes and persists results to Supabase.

## Features

- 📷 Real-time barcode & QR code scanning using the device camera (rear-facing by default)
- 🗄️ Saves every scan to Supabase (`scanned_items` table)
- 📋 Copy to clipboard with one tap
- 🔗 Auto-detects URLs and shows an "Open Link" button
- 🌙 Dark-mode mobile-first UI
- ❌ Graceful error handling for denied/missing camera

## Supported Formats

QR Code, EAN-13, EAN-8, Code 128, Code 39, UPC-A, UPC-E, Data Matrix, PDF 417, Aztec

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Styling**: Tailwind CSS v3
- **Scanner**: html5-qrcode
- **Database**: Supabase
- **Icons**: lucide-react

## Getting Started

### 1. Clone & install

```bash
git clone <your-repo-url>
cd barcode
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Create the Supabase table

In your Supabase dashboard → SQL Editor, run:

```sql
create table if not exists public.scanned_items (
  id         uuid primary key default gen_random_uuid(),
  raw_value  text not null,
  format     text not null default 'UNKNOWN',
  scanned_at timestamptz not null default now()
);

alter table public.scanned_items enable row level security;

create policy "Allow public inserts"
  on public.scanned_items for insert with check (true);

create policy "Allow public reads"
  on public.scanned_items for select using (true);
```

### 4. Run locally

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

> ⚠️ Camera access requires **HTTPS** or **localhost**. When testing on a mobile device via your local network, use a tunnel like [ngrok](https://ngrok.com) or deploy to Vercel/Netlify.

## Deployment

### Vercel

1. Push this repo to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in **Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Vite

### Netlify

1. Push this repo to GitHub
2. Connect at [app.netlify.com](https://app.netlify.com)
3. Set **Build command**: `npm run build` and **Publish directory**: `dist`
4. Add environment variables in **Site Settings → Environment Variables**
5. Deploy

## Project Structure

```
src/
├── components/
│   └── Scanner.tsx      # Main scanner component (state machine)
├── lib/
│   └── supabase.ts      # Supabase client singleton
├── types/
│   └── index.ts         # Shared TypeScript types
├── App.tsx              # Root layout
├── main.tsx             # Entry point
└── index.css            # Global styles + Tailwind directives
```
