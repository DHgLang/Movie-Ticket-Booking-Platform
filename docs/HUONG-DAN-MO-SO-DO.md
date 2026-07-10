# Mở sơ đồ draw.io

## Dùng file này (ảnh mentor, không bị lỗi)

```
D:\TT\movie-booking\docs\movie-booking-MENTOR.drawio
```

Ảnh `architecture-mau-chuan-real.png` nhúng sẵn — mở ra **giống hệt mẫu mentor**, không có mũi tên loạn.

## Cách mở

1. **Đóng hết tab draw.io** đang mở
2. Mở tab **ẩn danh** (Ctrl+Shift+N) → https://app.diagrams.net/
3. **Tập tin → Mở từ → Thiết bị** → chọn `movie-booking-MENTOR.drawio`
4. **Ctrl+0**

## Vì sao file cũ (`movie-booking-aws-v3.drawio`) luôn lỗi?

Draw.io **lưu bản sửa vào trình duyệt** (IndexedDB). Mỗi lần mở, nó merge bản browser (đã kéo/sửa sai) chứ không load file gốc → mũi tên chéo, label sai số.

**Không sửa** file v3 trong draw.io nữa.

## Nộp báo cáo

Dùng trực tiếp: `docs/architecture-mau-chuan-real.png`

Hoặc từ `movie-booking-MENTOR.drawio` → **Tập tin → Xuất PNG** (zoom 200%).
