# Deploy lên AWS (bắt buộc)

Local mock (`/api`) **chỉ để dev trên máy**. Để chạy trên AWS cần làm 4 bước sau.

## Bước 1 — Cài AWS CLI

Tải: https://aws.amazon.com/cli/

```powershell
aws --version
```

## Bước 2 — Cấu hình credentials

```powershell
cd D:\TT\movie-booking
npx ampx configure profile
```

Nhập:
- **Region:** `ap-southeast-1`
- **Access Key ID** + **Secret Access Key** (tạo tại AWS Console → IAM → Users → Security credentials)

Kiểm tra:

```powershell
aws sts get-caller-identity
```

## Bước 3 — Deploy backend Amplify

```powershell
cd D:\TT\movie-booking
npm run sandbox
```

Lần đầu ~10–15 phút. Tạo trên AWS:
- Cognito (auth)
- DynamoDB (Amplify Data)
- Lambda + API Gateway
- SQS + DLQ + Worker

Khi xong, file `amplify_outputs.json` được tạo ở thư mục gốc.

## Bước 4 — Trỏ frontend lên AWS API

Tạo `frontend/.env.local`:

```
VITE_API_URL=https://XXXX.execute-api.ap-southeast-1.amazonaws.com
TMDB_API_KEY=your_tmdb_key
```

Lấy URL từ `amplify_outputs.json` → `custom.apiUrl`.

**Lưu ý:** Khi deploy sandbox, set `TMDB_API_KEY` để Lambda tạo suất chiếu TMDB:

```powershell
$env:TMDB_API_KEY="your_key"
npx ampx sandbox --once
```

Chạy frontend (gọi AWS thật, không dùng mock):

```powershell
npm run dev
```

---

## Deploy frontend lên Amplify Hosting

**URL live:** https://main.d2zv6ka00i1nyo.amplifyapp.com

Build với env vars (Vite bake-in lúc build):

```powershell
$env:VITE_API_URL="https://x2nxz9vcxa.execute-api.ap-southeast-1.amazonaws.com"
$env:VITE_TMDB_API_KEY="your_tmdb_key"
npm run build -w frontend
```

**Quan trọng:** Zip phải dùng forward slash (`/`). Trên Windows dùng `tar`, **không** dùng `Compress-Archive`:

```powershell
cd frontend\dist
tar -caf ..\..\frontend-dist.zip *
```

Rồi upload qua Console hoặc:

```powershell
.\scripts\deploy-hosting.ps1
```

---

## Lỗi thường gặp

| Lỗi | Cách fix |
|-----|----------|
| `Failed to load AWS credentials` | Chạy `npx ampx configure profile` |
| `aws not recognized` | Cài AWS CLI |
| Frontend vẫn "Local API ready" | Tạo `frontend/.env.local` với `VITE_API_URL` |
| CORS error | API Gateway đã bật CORS trong `amplify/backend.ts` |

---

## Chi phí ước tính (ap-southeast-1)

- Sandbox dev: ~$5–30/tháng (Lambda, DynamoDB rẻ; tắt sandbox khi không dùng: `npm run sandbox:delete`)
