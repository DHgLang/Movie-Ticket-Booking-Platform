# Movie Ticket Booking Platform

Spirit Movie — full-stack movie ticket booking on **AWS Amplify** (React + Cognito + Lambda + SQS + DynamoDB).

**Live demo:** https://main.d2zv6ka00i1nyo.amplifyapp.com

## Chạy nhanh (máy mới — dùng backend demo)

```powershell
git clone https://github.com/DHgLang/Movie-Ticket-Booking-Platform.git
cd Movie-Ticket-Booking-Platform
npm install
# Tự tạo .env + amplify_outputs.json từ file mẫu

notepad .env
# Chỉ cần sửa: VITE_TMDB_API_KEY và TMDB_API_KEY (cùng một key TMDB)

npm run dev
```

Mở http://localhost:5173 — frontend trỏ API demo: `https://x2nxz9vcxa.execute-api.ap-southeast-1.amazonaws.com`

| File | Commit GitHub? | Ghi chú |
|------|----------------|---------|
| `.env.example` | Có | Mẫu — API URL đã điền sẵn |
| `.env` | Không | Copy khi `npm install`, bạn điền TMDB key |
| `amplify_outputs.example.json` | Có | Cognito + RUM demo (public) |
| `amplify_outputs.json` | Không | Tự tạo khi setup |

## Secrets & config (tự deploy AWS)

Do **not** commit `.env` hoặc `amplify_outputs.json` sau khi chạy sandbox riêng (xem `.gitignore`).

Nếu **tự deploy** backend (`npm run sandbox`), file `amplify_outputs.json` sẽ bị ghi đè bởi sandbox — cập nhật `VITE_API_URL` trong `.env` theo output mới.

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

# 4. Sửa .env — dán apiUrl từ amplify_outputs.json:
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

First run creates Cognito, API, SQS, DynamoDB tables. Copy `custom.apiUrl` from terminal into `.env`:

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
| `npm run setup` | Tạo `.env` + `amplify_outputs.json` từ mẫu (nếu chưa có) |
| `npm run dev` | Frontend local |
| `npm run sandbox` | Deploy Amplify sandbox |
| `npm run build` | Build frontend for production |
