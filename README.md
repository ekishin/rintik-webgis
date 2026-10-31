# RINTIK - WebGIS Persebaran & Rekomendasi UMKM Kota Bogor

**RINTIK** adalah platform *Web Geographic Information System* (WebGIS) interaktif yang dirancang untuk memvisualisasikan, mengeksplorasi, dan menganalisis persebaran titik Usaha Mikro, Kecil, dan Menengah (UMKM) di wilayah Kota Bogor. Platform ini hadir untuk mempermudah masyarakat dan wisatawan dalam menemukan UMKM lokal secara kontekstual berbasis wilayah geografis dan preferensi kebutuhan.

---

## Fitur Utama (Visitor POV)

* **Eksplorasi Spasial Interaktif**: Visualisasi sebaran ribuan titik UMKM di Kota Bogor dengan penanda tematik (*categorical styling*) berdasarkan kategori usaha (Kuliner, Fashion, Jasa, Kerajinan, dan Teknologi)
* **Filter Multi-Kriteria Dinamis**:
  * Pencarian instan berdasarkan nama UMKM, kelurahan, atau kecamatan
  * Filter kategori melalui antarmuka *pill badge* interaktif
  * Filter hierarki wilayah administrasi (Kecamatan & Kelurahan)
  * Filter radius jarak (*buffer*) adaptif (1 KM, 3 KM, 5 KM) dari titik acuan pengguna
* **Live Geolocation Tracking**: Deteksi lokasi riil pengguna berbasis GPS peramban (*HTML5 Geolocation API*) untuk mengurutkan UMKM terdekat secara otomatis
* **In-App Network Routing**: Navigasi rute jalan nyata (*turn-by-turn routing*) menggunakan OSRM (*Open Source Routing Machine*) langsung di dalam peta tanpa dialihkan ke aplikasi eksternal, lengkap dengan estimasi jarak dan waktu tempuh untuk moda **Sepeda Motor**, **Mobil**, dan **Jalan Kaki**
* **Statistik Persebaran Real-Time**: Panel analitik dinamis yang menyajikan ringkasan proporsi jumlah UMKM dan distribusi kategori per wilayah kecamatan yang sedang dipilih
* **Kontrol Layer Tematik**: Kemudahan mengaktifkan atau menonaktifkan tampilan layer sebaran UMKM dan batas administrasi wilayah Kota Bogor

---

## Tech Stack & Sumber Data

* **Peta & Analisis Spasial**: Leaflet.js, Turf.js (Geodesic Distance & Buffering)
* **Routing Engine**: OSRM (Open Source Routing Machine) Public API
* **Basemap**: Esri World Topo Map
* **Front-End**: Vanilla JavaScript (ES6+), HTML5, CSS3 (*Custom Light Cream Pastel UI*)
* **Format Data**: GeoJSON (`EPSG:4326 - WGS 84`)
* **Sumber Data**: Project QGIS, OpenStreetMap, Verifikasi Wilayah Kota Bogor, dan Google Maps

---

## Struktur Proyek

```text
rintik-webgis/
├── index.html                           # Halaman utama aplikasi WebGIS
├── css/                                 # Berkas styling kustom
├── js/                                  # Logika aplikasi dan skrip Leaflet
├── data/
│   ├── master_umkm_final_update.geojson # Dataset utama sebaran titik UMKM
│   └── bogor_administrasi.geojson       # Batas poligon administrasi Kota Bogor
└── README.md                            # Dokumentasi teknis proyek
```
---

## Cara Menjalankan Secara Lokal

* Kloning Repositori: git clone [https://github.com/ekishin/rintik-webgis.git](https://github.com/ekishin/rintik-webgis.git)
* Buka folder rintik-webgis menggunakan teks editor (seperti VS Code)
* Jalankan file index.html menggunakan ekstensi Live Server (klik kanan file index.html, lalu pilih Open with Live Server)
