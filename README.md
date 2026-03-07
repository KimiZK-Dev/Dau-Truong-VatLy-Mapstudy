# Khu Dầu 2 Quiz Web

Trang trắc nghiệm React đọc dữ liệu từ `public/data/khu_dau_2.json`.

## Chạy local

```bash
cd quiz-web
npm install
npm run dev
```

## Build

```bash
cd quiz-web
npm run build
```

## Deploy GitHub Pages

Workflow đã được tạo tại `.github/workflows/quiz-web-deploy.yml`.

Bước cần làm trên GitHub:
- Vào Settings → Pages → Source: GitHub Actions
- Đảm bảo branch `main` được push lên.

Khi push thay đổi trong `quiz-web/`, workflow sẽ tự build và deploy.
