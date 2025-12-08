@push('style')

    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">

    <style>
        /* RESET YANG BENAR */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            /* HAPUS overflow: hidden dari sini */
        }

        /* ===== LAYOUT UTAMA ===== */
        .container-fluid.p-0 {
            height: calc(100vh - 56px); /* tinggi viewport dikurangi tinggi header */
            display: flex;
            flex-direction: column;
        }

        /* ===== WRAPPER ===== */
        .wrapper {
            flex: 1; /* Mengisi sisa ruang */
            display: flex;
            overflow: hidden; /* Tetap hidden di wrapper, bukan di body */
            background: #f0f0f0;
            position: relative; /* Ubah dari absolute ke relative */
        }

        /* ===== FOOTER ===== */
        /* Pastikan footer ada di luar wrapper */
        footer {
            position: relative;
            z-index: 10;
            background: #fff;
            border-top: 1px solid #ddd;
        }

        /* ===== SIDEBAR KIRI ===== */
        #sidebar {
            width: 320px;
            min-width: 320px;
            background: #fff;
            border-right: 1px solid #ddd;
            overflow-y: auto;
            transition: all 0.3s ease;
            position: relative;
            z-index: 20;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        #sidebar.hidden {
            min-width: 0;
            width: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            border-right: none;
        }

        /* ===== MAP AREA ===== */
        #map {
            flex: 1;
            min-width: 0;
            height: 100%;
            z-index: 1;
            position: relative;
        }

        /* ===== PANEL DETAIL KANAN ===== */
        #detailPanel {
            width: 320px;
            min-width: 320px;
            background: #fff;
            border-left: 1px solid #ddd;
            padding: 20px;
            overflow-y: auto;
            transition: all 0.3s ease;
            position: relative;
            z-index: 20;
            box-shadow: -2px 0 5px rgba(0,0,0,0.1);
        }
        #detailPanel.hidden {
            min-width: 0;
            width: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            border-left: none;
        }

        /* ===== TOGGLE BUTTONS ===== */
        #toggleSidebarLeft {
            position: absolute;
            top: 50%;
            left: 310px;
            transform: translateY(-50%);
            background: #2c3e50;
            color: #fff;
            border: none;
            width: 20px;
            height: 60px;
            cursor: pointer;
            border-radius: 15px;
            z-index: 30;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: left 0.3s ease;
        }

        #toggleSidebarLeft:hover {
            background: #34495e;
        }

        #toggleSidebarRight {
            position: absolute;
            top: 50%;
            right: 310px;
            transform: translateY(-50%);
            background: #2c3e50;
            color: #fff;
            border: none;
            width: 20px;
            height: 60px;
            cursor: pointer;
            border-radius: 15px;
            z-index: 30;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: right 0.3s ease;
        }

        #toggleSidebarRight:hover {
            background: #34495e;
        }

        /* Ketika sidebar tersembunyi */
        #sidebar.hidden + #toggleSidebarLeft {
            left: 0;
        }

        #detailPanel.hidden ~ #toggleSidebarRight {
            right: 0;
        }

        /* Responsif untuk mobile */
        @media (max-width: 768px) {
            .container-fluid.p-0 {
                height: calc(100vh - 56px); /* sesuaikan jika header mobile berbeda */
            }
            
            #sidebar, #detailPanel {
                width: 280px;
                min-width: 280px;
            }
            
            #toggleSidebarLeft {
                left: 280px;
            }
            
            #toggleSidebarRight {
                right: 280px;
            }
        }
    </style>

@endpush

@extends('layouts.admin')
@section('title', 'Monitoring Kendaraan')
@section('content')

<div class="container-fluid p-0">
    <!-- Konten Utama -->
    <div class="wrapper">
        <!-- Sidebar Kiri -->
        <div id="sidebar">...</div>
        
        <!-- Tombol toggle sidebar kiri -->
        <button id="toggleSidebarLeft" onclick="toggleSidebarLeft()">⮜</button>
        
        <!-- Peta -->
        <div id="map"></div>
        
        <!-- Panel Detail Kanan -->
        <div id="detailPanel">...</div>
        
        <!-- Tombol toggle sidebar kanan -->
        <button id="toggleSidebarRight" onclick="toggleSidebarRight()">⮞</button>
    </div>
    
    <!-- Footer akan muncul di sini secara otomatis dari layout admin -->
</div>

@endsection

@push('scripts')

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://rawcdn.githack.com/bbecquet/Leaflet.RotatedMarker/master/leaflet.rotatedMarker.js"></script>

<script>
const URL_API = "https://dev.speedtrack.id/api/objects";
const REFRESH_INTERVAL = 5000;

let map = L.map('map').setView([-6.4, 106.63], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = {};
let deviceList = [];

/* ============================
   LOAD DATA
=============================== */
function loadData() {
    fetch(URL_API)
        .then(res => res.json())
        .then(data => {
            if (data.result) {
                deviceList = data.result;
                renderList(deviceList);
                updateMarkers(deviceList);
            }
        })
        .catch(err => console.error("API Error:", err));
}

/* ============================
   LIST KENDARAAN + SEARCH
=============================== */
function renderList(devices) {
    const listContainer = document.getElementById("list");
    if (!listContainer) return;
    
    if (devices.length === 0) {
        listContainer.innerHTML = '<p class="text-muted p-3">Tidak ada data kendaraan</p>';
        return;
    }
    
    let html = "";
    devices.forEach(d => {
        html += `
            <div class="item" onclick="selectDevice('${d.imei}')">
                <b>${d.name || d.plate_number || d.imei}</b><br>
                <small>Status: ${d.st} - ${d.ststr}</small><br>
                <small class="text-muted">${d.address || 'Lokasi tidak diketahui'}</small>
            </div>`;
    });
    listContainer.innerHTML = html;
}

function filterList() {
    let q = document.getElementById("searchInput").value.toLowerCase();
    let filtered = deviceList.filter(d =>
        (d.name || "").toLowerCase().includes(q) ||
        (d.plate_number || "").toLowerCase().includes(q) ||
        (d.imei || "").includes(q)
    );
    renderList(filtered);
}

/* ============================
   UPDATE MARKER
=============================== */
function updateMarkers(devices) {
    devices.forEach(d => {
        let lat = parseFloat(d.lat);
        let lng = parseFloat(d.lng);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        let latlng = [lat, lng];
        let angle = parseFloat(d.angle || d.course || d.direction || 0);

        // Gunakan marker default jika tidak ada URL marker
        let markerUrl = d.marker || 'https://unpkg.com/leaflet/dist/images/marker-icon.png';
        
        let icon = L.icon({
            iconUrl: markerUrl,
            iconSize: [30, 40],
            iconAnchor: [15, 40]
        });

        if (!markers[d.imei]) {
            markers[d.imei] = L.marker(latlng, {
                icon: icon,
                rotationAngle: angle,
                rotationOrigin: "center center",
                title: d.name || d.imei
            })
            .addTo(map)
            .on("click", () => showDetail(d));

        } else {
            markers[d.imei].setLatLng(latlng);
            markers[d.imei].setRotationAngle(angle);
        }
    });
}

/* ============================
   KLIK LIST → MAP + DETAIL
=============================== */
function selectDevice(imei) {
    let d = deviceList.find(v => v.imei == imei);
    if (!d) return;

    // Buka panel detail jika tertutup
    const detailPanel = document.getElementById("detailPanel");
    if (detailPanel.classList.contains("hidden")) {
        toggleSidebarRight();
    }

    let marker = markers[imei];
    if (marker) {
        map.setView(marker.getLatLng(), 16);
    }

    showDetail(d);
}

/* ============================
   TAMPILKAN DETAIL PANEL
=============================== */
function showDetail(d) {
    const detailContent = document.getElementById("detailContent");
    if (!detailContent) return;
    
    detailContent.innerHTML = `
        <div class="mb-3">
            <h6>${d.name || 'Tidak ada nama'}</h6>
            <hr>
        </div>
        <div class="mb-2"><b>IMEI:</b> ${d.imei}</div>
        <div class="mb-2"><b>Nomor Polisi:</b> ${d.plate_number || '-'}</div>
        <div class="mb-2"><b>Status:</b> ${d.st} (${d.ststr})</div>
        <div class="mb-2"><b>Kecepatan:</b> ${d.speed || 0} km/h</div>
        <div class="mb-2"><b>Arah:</b> ${d.angle || 0}°</div>
        <div class="mb-2"><b>Update Terakhir:</b> ${d.dt_tracker || '-'}</div>
        <div class="mb-3"><b>Alamat:</b><br>${d.address || '-'}</div>
        <div class="small text-muted">
            <b>Koordinat:</b> ${d.lat}, ${d.lng}
        </div>
    `;
}

/* ============================
   COLLAPSIBLE SIDEBAR
=============================== */
function toggleSidebarLeft() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggleSidebarLeft");
    
    sidebar.classList.toggle("hidden");
    
    // Ganti arah panah
    if (sidebar.classList.contains("hidden")) {
        toggleBtn.innerHTML = "⮞";
    } else {
        toggleBtn.innerHTML = "⮜";
    }
}

function toggleSidebarRight() {
    const detailPanel = document.getElementById("detailPanel");
    const toggleBtn = document.getElementById("toggleSidebarRight");
    
    detailPanel.classList.toggle("hidden");
    
    // Ganti arah panah
    if (detailPanel.classList.contains("hidden")) {
        toggleBtn.innerHTML = "⮜";
    } else {
        toggleBtn.innerHTML = "⮞";
    }
}

/* ============================
   INITIALIZE
=============================== */
document.addEventListener('DOMContentLoaded', function() {
    // Load data pertama kali
    loadData();
    
    // Set interval untuk refresh data
    setInterval(loadData, REFRESH_INTERVAL);
    
    // Resize map saat window di-resize
    window.addEventListener('resize', function() {
        map.invalidateSize();
    });
});
</script>

@endpush
