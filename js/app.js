// Inisialisasi Peta Leaflet (Fokus pada Kota Bogor)
const map = L.map('map', {
    center: [-6.5950, 106.7900],
    zoom: 13,
    zoomControl: true
});

// Tile Layer Basemap (CartoDB Dark Matter untuk kontras data spasial tematik)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

// Variabel Global
let administrasiLayer = null;
let umkmLayer = null;
let rawUmkmFeatures = [];
let userLocation = null; // [lat, lng]
let userBufferLayer = null;

// Warna Tematik Kategori UMKM
function getKategoriColor(kategori) {
    const kat = (kategori || '').toLowerCase();
    if (kat.includes('kuliner') || kat.includes('makanan')) return '#ef4444';
    if (kat.includes('fashion')) return '#ec4899';
    if (kat.includes('jasa')) return '#10b981';
    if (kat.includes('rajin') || kat.includes('kriya')) return '#f59e0b';
    if (kat.includes('agro')) return '#84cc16';
    if (kat.includes('tekno')) return '#06b6d4';
    return '#8b5cf6';
}

// 1. Muat Poligon Batas Administrasi Kota Bogor
fetch('data/bogor_administrasi.geojson')
    .then(res => res.json())
    .then(geojsonData => {
        administrasiLayer = L.geoJSON(geojsonData, {
            style: {
                color: '#38bdf8',
                weight: 1.5,
                dashArray: '4, 4',
                fillColor: '#38bdf8',
                fillOpacity: 0.04
            },
            onEachFeature: (feature, layer) => {
                const namaWilayah = feature.properties.NAMOBJ || feature.properties.KECAMATAN || feature.properties.KELURAHAN || 'Wilayah Bogor';
                layer.bindTooltip(`Batas: ${namaWilayah}`, { sticky: true });
            }
        }).addTo(map);
    })
    .catch(err => console.warn('Batas administrasi belum termuat:', err));

// 2. Muat Data Titik Sebaran UMKM
fetch('data/umkm_bogor.geojson')
    .then(res => res.json())
    .then(data => {
        rawUmkmFeatures = data.features;
        document.getElementById('stat-total').innerText = rawUmkmFeatures.length;
        
        populateDropdowns(rawUmkmFeatures);
        prosesDanTampilkanData();
    })
    .catch(err => console.error('Gagal memuat GeoJSON UMKM:', err));

// Mengisi Dropdown Filter secara Dinamis
function populateDropdowns(features) {
    const wilayahSet = new Set();
    const kategoriSet = new Set();

    features.forEach(f => {
        const props = f.properties;
        const wil = props.kelurahan || props.kecamatan;
        if (wil) wilayahSet.add(wil.trim());
        if (props.kategori) kategoriSet.add(props.kategori.trim());
    });

    const selectWil = document.getElementById('filter-wilayah');
    Array.from(wilayahSet).sort().forEach(w => {
        selectWil.innerHTML += `<option value="${w}">${w}</option>`;
    });

    const selectKat = document.getElementById('filter-kategori');
    Array.from(kategoriSet).sort().forEach(k => {
        selectKat.innerHTML += `<option value="${k}">${k}</option>`;
    });
}

// Logika Pemeringkatan & Rekomendasi Multi-Kriteria (Jarak + Rating)
function hitungSkorRekomendasi(feature, maxDist) {
    const rating = parseFloat(feature.properties.rating) || 4.0;
    const normRating = rating / 5.0; // Bobot Rating (0 - 1)

    let normDistance = 1.0;
    if (feature.calculatedDistance !== undefined && maxDist > 0) {
        // Semakin dekat jaraknya, semakin tinggi skornya
        normDistance = 1.0 - (feature.calculatedDistance / maxDist);
        if (normDistance < 0) normDistance = 0;
    }

    // Formula Rekomendasi: 60% Faktor Kedekatan Jarak + 40% Faktor Reputasi/Rating
    const finalScore = userLocation 
        ? (normDistance * 0.6) + (normRating * 0.4) 
        : normRating;

    return (finalScore * 100).toFixed(1);
}

// Pemfilteran dan Visualisasi ke Peta & Sidebar
function prosesDanTampilkanData() {
    const keyword = document.getElementById('filter-search').value.toLowerCase();
    const wilayahVal = document.getElementById('filter-wilayah').value;
    const kategoriVal = document.getElementById('filter-kategori').value;
    const radiusVal = parseFloat(document.getElementById('filter-radius').value);

    // Buffer visual jika radius diaktifkan
    if (userBufferLayer) map.removeLayer(userBufferLayer);
    if (userLocation && radiusVal > 0) {
        const userPoint = turf.point([userLocation[1], userLocation[0]]);
        const buffered = turf.buffer(userPoint, radiusVal, { units: 'kilometers' });
        
        userBufferLayer = L.geoJSON(buffered, {
            style: { color: '#38bdf8', weight: 1.5, fillColor: '#0284c7', fillOpacity: 0.15, dashArray: '5, 5' }
        }).addTo(map);
    }

    // Filter Atribut & Spasial
    let filtered = rawUmkmFeatures.filter(feature => {
        const props = feature.properties;
        const nama = (props.nama_umkm || props.nama || '').toLowerCase();
        const wil = (props.kelurahan || props.kecamatan || '');
        const kat = (props.kategori || '');
        const coords = feature.geometry.coordinates; // [lng, lat]

        const matchText = nama.includes(keyword);
        const matchWil = (wilayahVal === 'ALL') || (wil === wilayahVal);
        const matchKat = (kategoriVal === 'ALL') || (kat === kategoriVal);

        // Kalkulasi Jarak Geodesik jika lokasi user aktif
        let matchRadius = true;
        if (userLocation) {
            const ptUser = turf.point([userLocation[1], userLocation[0]]);
            const ptUmkm = turf.point([coords[0], coords[1]]);
            const distKm = turf.distance(ptUser, ptUmkm, { units: 'kilometers' });
            feature.calculatedDistance = distKm;

            if (radiusVal > 0) {
                matchRadius = distKm <= radiusVal;
            }
        }

        return matchText && matchWil && matchKat && matchRadius;
    });

    // Jalankan sistem ranking rekomendasi
    const maxFilterDist = radiusVal > 0 ? radiusVal : 10;
    filtered.forEach(f => {
        f.recomScore = parseFloat(hitungSkorRekomendasi(f, maxFilterDist));
    });
    // Urutkan berdasarkan skor tertinggi
    filtered.sort((a, b) => b.recomScore - a.recomScore);

    // Update Counter
    document.getElementById('stat-filtered').innerText = filtered.length;

    // Render ke Map & Sidebar
    renderMapMarkers(filtered);
    renderSidebarCards(filtered.slice(0, 30)); // Tampilkan 30 rekomendasi teratas di list
}

// Render CircleMarker pada Leaflet
function renderMapMarkers(features) {
    if (umkmLayer) map.removeLayer(umkmLayer);

    umkmLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
        pointToLayer: function(feature, latlng) {
            const props = feature.properties;
            const markerColor = getKategoriColor(props.kategori);

            const marker = L.circleMarker(latlng, {
                radius: 6.5,
                fillColor: markerColor,
                color: '#ffffff',
                weight: 1.5,
                fillOpacity: 0.9
            });

            const popupContent = `
                <div style="font-size: 12px; min-width: 180px;">
                    <b style="color: #0284c7; font-size: 13px;">${props.nama_umkm || props.nama}</b><br>
                    <span>Kategori: <b>${props.kategori || '-'}</b></span><br>
                    <span>Wilayah: ${props.kelurahan || props.kecamatan || 'Kota Bogor'}</span><br>
                    <span>Rating: ⭐ ${props.rating || '4.0'}</span><br>
                    ${feature.calculatedDistance ? `<span>Jarak: <b>${feature.calculatedDistance.toFixed(2)} km</b></span><br>` : ''}
                    <div style="margin-top: 6px; padding: 2px 6px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-weight: 700; text-align: center;">
                        Skor Rekomendasi: ${feature.recomScore}%
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
            return marker;
        }
    }).addTo(map);
}

// Render Card List pada Sidebar
function renderSidebarCards(features) {
    const listContainer = document.getElementById('umkm-list-container');
    listContainer.innerHTML = '';

    if (features.length === 0) {
        listContainer.innerHTML = '<div style="font-size: 12px; color: #64748b; text-align: center; padding: 20px;">Tidak ada UMKM yang cocok dengan kriteria spasial.</div>';
        return;
    }

    features.forEach(f => {
        const props = f.properties;
        const coords = f.geometry.coordinates; // [lng, lat]
        const card = document.createElement('div');
        card.className = 'umkm-card';
        card.innerHTML = `
            <div class="umkm-title">${props.nama_umkm || props.nama}</div>
            <div class="umkm-sub">
                <span>${props.kategori || 'Umum'} &bull; ${props.kelurahan || 'Bogor'}</span>
                <span class="score-pill">Skor ${f.recomScore}%</span>
            </div>
            ${f.calculatedDistance ? `<div style="font-size: 10px; color: #38bdf8; margin-top: 4px;"><i class="fa-solid fa-location-arrow"></i> ${f.calculatedDistance.toFixed(2)} km dari Anda</div>` : ''}
        `;
        card.onclick = () => {
            map.flyTo([coords[1], coords[0]], 16);
            // Buka popup jika marker diklik dari list
            umkmLayer.eachLayer(layer => {
                if (layer.getLatLng().lat === coords[1] && layer.getLatLng().lng === coords[0]) {
                    layer.openPopup();
                }
            });
        };
        listContainer.appendChild(card);
    });
}

// Deteksi Geolocation Pengguna (Fallback Pajajaran Bogor jika di luar batas)
function lacakPosisiPengguna() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            let lat = pos.coords.latitude;
            let lng = pos.coords.longitude;

            // Validasi spasial: jika hasil GPS di luar batas Jawa Barat/Bogor, set koordinat tengah Bogor
            if (lat > -6.4 || lat < -6.8 || lng < 106.6 || lng > 107.0) {
                lat = -6.5950;
                lng = 106.8053;
            }

            userLocation = [lat, lng];
            L.marker(userLocation, {
                icon: L.divIcon({
                    className: 'user-pin',
                    html: '<div style="background:#38bdf8; width:14px; height:14px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 8px #38bdf8;"></div>'
                })
            }).addTo(map).bindPopup('<b>Lokasi Anda Saat Ini</b>').openPopup();

            map.setView(userLocation, 14);
            prosesDanTampilkanData();
        }, () => {
            alert('Akses lokasi tidak diizinkan. Menggunakan titik tengah Kota Bogor.');
            userLocation = [-6.5950, 106.8053];
            prosesDanTampilkanData();
        });
    }
}

// Event Listeners Filter
document.getElementById('filter-search').addEventListener('input', prosesDanTampilkanData);
document.getElementById('filter-wilayah').addEventListener('change', prosesDanTampilkanData);
document.getElementById('filter-kategori').addEventListener('change', prosesDanTampilkanData);
document.getElementById('filter-radius').addEventListener('change', prosesDanTampilkanData);