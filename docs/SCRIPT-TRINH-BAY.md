# Movie Ticket Booking — Script trình bày (theo sơ đồ ref)

## 1. Mô tả dự án

Hệ thống **Movie Ticket Booking System** trên AWS, kiến trúc **Serverless** + **Event-Driven**. Người dùng đặt vé, thanh toán, nhận email xác nhận; nhân viên check-in bằng mã vé. Mục tiêu: mở rộng, sẵn sàng cao, bảo mật, tối ưu chi phí.

## 2. Mô tả mô hình

- **Edge:** WAF → CloudFront → S3 (static web)
- **Auth:** Amazon Cognito (login, JWT)
- **API:** API Gateway (verify token → Lambda)
- **Application:** Payment / Ticket / Booking Lambda; SQS + Worker Lambda; SNS gửi email
- **Data (VPC 2 AZ):** ElastiCache Redis, RDS Proxy, RDS Primary + Standby
- **Observability:** CloudWatch, X-Ray, SNS cảnh báo Dev/Admin
- **DLQ:** Redrive policy; alarm khi có message lỗi

## 3. Luồng hoạt động (đánh số trên sơ đồ)

| Bước | Luồng |
|------|--------|
| 1 | User → HTTPS → WAF |
| 2 | CloudFront fetch static từ S3 |
| 3 | Login Cognito → JWT |
| 4 | CloudFront route API → API Gateway |
| 4.1 | API Gateway verify token với Cognito |
| 5.1 | Invoke Payment Lambda → RDS (balance) |
| 5.2 | Booking Lambda → SQS |
| 5.3 | Ticket Lambda → Redis / RDS |
| 6 | Worker Lambda deduct cache (Redis) |
| 7 | Booking gửi message vào SQS |
| 8 | Worker poll queue |
| 9 | Worker ghi DB qua RDS Proxy |
| 10 | Worker publish event → SNS |
| 11 | SNS gửi email cho User |
| — | DLQ lỗi → alarm SNS → Dev/Admin |

## File sơ đồ

`movie-booking-aws-v3.drawio` — mở [draw.io](https://app.diagrams.net/) → Export PNG.
