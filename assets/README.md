# AWS Architecture Icons (chính thức)

Đã tải **AWS Asset Package Q1 2025** từ [aws.amazon.com/architecture/icons](https://aws.amazon.com/architecture/icons/).

## Thư mục

```
assets/aws-architecture-icons/
├── Architecture-Service-Icons_02072025/   ← icon từng dịch vụ (Lambda, S3, API Gateway…)
├── Architecture-Group-Icons_02072025/     ← khung AWS Cloud, Region, VPC…
├── Category-Icons_02072025/
└── Resource-Icons_02072025/
```

## Vẽ sơ đồ Movie Booking (draw.io)

1. Mở [https://app.diagrams.net/](https://app.diagrams.net/)
2. **File → Open from → Device** — hoặc tạo diagram mới
3. Kéo icon: **Arrange → Insert → Image** → chọn file `.svg` trong thư mục trên

### Icon cần cho đề tài nhóm

| Dịch vụ | Tìm trong `Architecture-Service-Icons` |
|---------|----------------------------------------|
| Route 53 | Networking-Content-Delivery |
| CloudFront, WAF | Networking-Content-Delivery / Security |
| S3 | Storage |
| Cognito | Security-Identity-Compliance |
| API Gateway | App-Integration |
| Lambda | Compute |
| DynamoDB, RDS, ElastiCache | Database |
| EventBridge, SQS | App-Integration |
| SES | Business-Applications |
| CloudWatch, SNS | Management-Governance |
| CodePipeline, CodeCommit, CodeBuild | Developer-Tools |

4. Nội dung luồng 1–18: xem `docs/aws-architecture.html`
5. **File → Export as → PNG/PDF** → nộp Proposal

## Lưu ý mentor

- **Route 53, CloudFront, WAF** vẽ **ngoài** khung Region (dùng Group Icons)
- **Payment Gateway (VNPay)** vẽ **ngoài** viền AWS Cloud
- Không nối DynamoDB thẳng SES — qua Lambda/SQS
