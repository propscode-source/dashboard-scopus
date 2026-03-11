# Scopus Analytics Dashboard - Cron Job Setup

Untuk melakukan sinkronisasi otomatis data Scopus setiap 6 jam, Anda dapat menggunakan beberapa pendekatan tergantung pada infrastruktur deployment Anda (misalnya Coolify, Vercel, atau VPS tradisional).

## Pendekatan 1: Menggunakan Node.js Cron (Internal Server)

Jika Anda mendeploy aplikasi ini sebagai Node.js Standalone (seperti yang dikonfigurasi di Dockerfile), Anda dapat menambahkan package `node-cron` ke dalam `server.ts`.

1. Install package:
   ```bash
   npm install node-cron
   npm install -D @types/node-cron
   ```

2. Tambahkan kode berikut di `server.ts`:
   ```typescript
   import cron from 'node-cron';

   // Jalankan setiap 6 jam (menit 0, jam 0, 6, 12, 18)
   cron.schedule('0 */6 * * *', async () => {
     console.log('Menjalankan sinkronisasi data Scopus...');
     try {
       // Panggil fungsi untuk fetch data dari API Scopus asli
       // await fetchRealScopusData();
       console.log('Sinkronisasi berhasil.');
     } catch (error) {
       console.error('Gagal melakukan sinkronisasi:', error);
     }
   });
   ```

## Pendekatan 2: Menggunakan External Cron Service (Rekomendasi)

Pendekatan ini lebih disarankan untuk arsitektur serverless atau containerized karena tidak membebani memory server secara terus-menerus.

1. Buat sebuah endpoint khusus untuk sinkronisasi, misalnya `POST /api/scopus/sync`.
2. Amankan endpoint tersebut dengan API Key (Authorization header).
3. Gunakan layanan eksternal seperti:
   - **Coolify Scheduled Tasks**: Jika menggunakan Coolify, Anda bisa membuat "Scheduled Task" yang menjalankan perintah `curl -X POST https://domain-anda.com/api/scopus/sync -H "Authorization: Bearer SECRET_KEY"` dengan cron expression `0 */6 * * *`.
   - **GitHub Actions**: Buat workflow `.github/workflows/sync.yml` dengan trigger `schedule`.
   - **Cron-job.org**: Layanan gratis untuk memanggil webhook/URL secara berkala.

### Contoh Implementasi Endpoint Sync di `server.ts`:

```typescript
app.post("/api/scopus/sync", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Logika untuk mengambil data terbaru dari Scopus API
    // dan menyimpannya ke database
    
    res.json({ success: true, message: 'Sync completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});
```

Dengan arsitektur ini, sistem Anda akan tetap ringan, modular, dan mudah di-maintain.
