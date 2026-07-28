# YKS Koçu

Oğlunuzun YKS hazırlığını konu konu, test test ve gün gün takip etmenizi sağlayan mobil uyumlu web uygulaması.

**Hedef sıralama:** İlk 20.000  
**Başlangıç sıralaması:** 363.000 (2026)

## Özellikler

- **Bugün** — Günlük görevler, hedef ilerleme, hızlı test/deneme girişi
- **Konular** — TYT/AYT ders ve konu hakimiyeti (TYT 9 ders, AYT 4 ders)
- **Test** — Doğru/yanlış/boş, süre, soru başına dk analizi
- **Program** — Haftalık takvim, günlük görev planlama
- **Deneme** — TYT/AYT net girişi, trend takibi
- **Rapor** — Deneme grafikleri, zayıf dersler, yavaş konular

## Kurulum

```bash
cd C:\Users\memis\Desktop\yks-kocu
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

## Tablet / Telefonda Kullanım

1. Telefon veya tablet tarayıcısından uygulamayı açın
2. **Ana ekrana ekle** (Safari: Paylaş → Ana Ekrana Ekle / Chrome: Menü → Ana ekrana ekle)
3. Uygulama gibi tam ekran kullanılabilir

## Veri

Tüm veriler cihazda `localStorage` içinde saklanır. Veriler tarayıcıya özeldir; farklı cihazlarda senkron olmaz.

## Geliştirme

```bash
npm run build   # üretim derlemesi
npm run preview # derlenmiş sürümü önizle
```
