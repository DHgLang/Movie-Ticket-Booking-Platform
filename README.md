# Movie Ticket Booking Platform

Spirit Movie — full-stack movie ticket booking on **AWS Amplify** (React + Cognito + Lambda + SQS + DynamoDB).

**Live demo:** https://main.d2zv6ka00i1nyo.amplifyapp.com

## Secrets & `amplify_outputs.json`

Do **not** commit `amplify_outputs.json` or `.env.local` (see `.gitignore`).

After clone:

```powershell
npm install
npx ampx sandbox --once
# Creates amplify_outputs.json locally (Cognito, API URL, RUM, …)

copy amplify_outputs.example.json amplify_outputs.json   # only if sandbox not run yet
# Then replace REPLACE_ME values from sandbox output.

# frontend/.env.local
VITE_API_URL=https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com
VITE_TMDB_API_KEY=your_tmdb_key
```

VNPay / TMDB for Lambda: set env vars when running `npx ampx sandbox --once` (never commit).

## Structure

```
movie-booking/
├── frontend/          # React + Vite + TypeScript
├── amplify/           # Amplify Gen 2 backend
├── shared/            # Shared types & helpers
└── tools/             # Optional utilities
```

## Chạy trên AWS (không phải local mock)

```powershell
# 1. Cài AWS CLI: https://aws.amazon.com/cli/
# 2. Cấu hình:
cd D:\TT\movie-booking
npx ampx configure profile

# 3. Deploy lên AWS:
npm run sandbox

# 4. Tạo frontend/.env.local — dán apiUrl từ amplify_outputs.json:
#    VITE_API_URL=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com

# 5. Chạy FE trỏ AWS:
npm run dev
```

| Mode | Khi nào | API |
|------|---------|-----|
| Local mock | Chưa có AWS key | `/api` trên localhost |
| **AWS thật** | Sau `npm run sandbox` | `VITE_API_URL` → API Gateway |

## Quick start (local tạm — chờ AWS)

### 1. Prerequisites

- Node.js 18+
- AWS CLI configured (`aws configure`)
- Region: **ap-southeast-1**

### 2. Install

```powershell
cd D:\TT\movie-booking
npm install
```

### 3. Deploy backend (Amplify sandbox)

```powershell
npm run sandbox
```

First run creates Cognito, API, SQS, DynamoDB tables. Copy `custom.apiUrl` from terminal into `frontend/.env.local`:

```
VITE_API_URL=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com
```

### 4. Run frontend

```powershell
npm run dev
```

Open http://localhost:5173

## Features

- Browse movies → showtimes → seat map
- Cognito login + checkout
- Seat lock API (DynamoDB)
- Booking → SQS → worker Lambda
- QR ticket page
- Admin panel (movies, showtimes, bookings)
- 10-minute sale cutoff before showtime (VN timezone)

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | Amplify Hosting / React |
| Auth | Amplify Auth (Cognito) |
| API | API Gateway + Lambda |
| Data | DynamoDB |
| Queue | SQS + DLQ + Worker |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend local |
| `npm run sandbox` | Deploy Amplify sandbox |
| `npm run build` | Build frontend for production |
