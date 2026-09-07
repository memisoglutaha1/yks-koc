# YKS Koçu

Öğretmenin birden fazla öğrencinin YKS hazırlığını **farklı cihazlardan** takip etmesi için web uygulaması. Veriler Supabase (bulut) üzerinde saklanır.

## Canlı

https://memisoglutaha1.github.io/yks-koc/

## Roller

- **Öğretmen** — Öğrenci hesabı oluşturur, şifreleri görür, tüm çalışmaları izler
- **Öğrenci** — Kendi kullanıcı/şifresiyle herhangi bir cihazdan giriş yapar

## Supabase kurulumu (zorunlu)

1. [supabase.com](https://supabase.com) → yeni proje oluştur
2. **SQL Editor** → `supabase/schema.sql` dosyasının tamamını yapıştır → Run
3. **Project Settings → API** → `Project URL` ve `anon public` key kopyala
4. Proje kökünde `.env` oluştur:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

5. Yerelde: `npm install && npm run dev`
6. Canlı için GitHub repo **Settings → Secrets and variables → Actions**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Kurulum

```bash
npm install
npm run dev
```

## Geliştirme

```bash
npm run build
npm run preview
```
