# YKS Koçu

Öğretmenin birden fazla öğrencinin YKS hazırlığını takip etmesi için mobil uyumlu web uygulaması.

## Roller

- **Öğretmen** — Öğrenci hesabı oluşturur (kullanıcı adı + şifre), tüm çalışmaları görür, plan/program düzenleyebilir
- **Öğrenci** — Kendi hesabıyla giriş yapar; test, deneme, konu ve günlük görevlerini kaydeder

## Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda Vite’ın verdiği adresi açın (ör. `http://localhost:5173`).

## İlk kullanım

1. **Öğretmen hesabı oluştur** (`/kurulum`)
2. Panelden **Öğrenci Ekle** → kullanıcı adı ve şifre ver
3. Öğrenci aynı tarayıcıda **Giriş** yaparak kendi hesabını kullanır
4. Öğretmen listeden öğrenciye tıklayarak tüm çalışmaları (test, deneme, konu, program, rapor) inceleyebilir

## Veri

Hesaplar ve çalışmalar cihazda `localStorage` içinde saklanır. Aynı tarayıcı / cihaz gerekir; farklı cihazlarda otomatik senkron yoktur.

## Geliştirme

```bash
npm run build
npm run preview
```
