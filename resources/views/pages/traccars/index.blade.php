@push('style')

    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">

    <style>
        body { margin:0; padding:0; }

        .wrapper {
            display: flex;
            height: calc(100vh - 80px); /* menyesuaikan tinggi layout admin */
            overflow: hidden;
            position: relative;
        }

        /* SIDEBAR KIRI */
        #sidebar {
            width: 320px;
            background: #fff;
            border-right: 1px solid #ddd;
            overflow-y: auto;
            transition: 0.3s;
            display: flex;
            flex-direction: column;
            box-shadow: 2px 0 5px rgba(0,0,0,0.05);
            z-index: 10;
        }
        #sidebar.hidden {
            width: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }

        #toggleBtn {
            background: #2c3e50;
            color: #fff;
            padding: 10px;
            cursor: pointer;
            text-align: center;
            font-weight: bold;
        }

        #searchInput {
            margin: 10px;
            padding: 8px;
            border-radius: 6px;
            border: 1px solid #ccc;
        }

        .item {
            padding: 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        .item:hover {
            background: #f5f5f5;
        }
        .item b {
            font-size: 15px;
        }
        .item small {
            color: #666;
        }

        /* MAP TENGAH */
        #map {
            flex: 1;
            z-index: 1;
        }

        /* PANEL DETAIL KANAN */
        #detailPanel {
            width: 320px;
            background: #fafafa;
            border-left: 1px solid #ddd;
            padding: 15px;
            overflow-y: auto;
            box-shadow: -2px 0 5px rgba(0,0,0,0.05);
        }

        #detailPanel h3 {
            margin-bottom: 10px;
            font-size: 18px;
            font-weight: bold;
        }
    </style>

@endpush

@extends('layouts.admin')
@section('title', 'Monitoring Kendaraan')
@section('content')

<div class="container-fluid"> 

    <div class="wrapper">

    <!-- Sidebar kiri -->
    <div id="sidebar">
        <div id="toggleBtn" onclick="toggleSidebar()">⮜ Hide Panel</div>
        <input type="text" id="searchInput" placeholder="Cari kendaraan..." onkeyup="filterList()">
        <div id="list">Loading...</div>
    </div>

    <!-- Peta -->
    <div id="map"></div>

    <!-- Panel detail kanan -->
    <div id="detailPanel">
        <h3>Detail Kendaraan</h3>
        <div id="detailContent">Klik marker atau list kendaraan...</div>
    </div>

</div>


</div>

@endsection

@push('scripts')

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://rawcdn.githack.com/bbecquet/Leaflet.RotatedMarker/master/leaflet.rotatedMarker.js"></script>

<script>
const URL_API = "https://dev.speedtrack.id/api/objects";
const REFRESH_INTERVAL = 5000;

let map = L.map('map').setView([-6.4, 106.63], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let markers = {};
let deviceList = [];

/* ============================
   LOAD DATA
=============================== */
function loadData() {
    fetch(URL_API)
        .then(res => res.json())
        .then(data => {
            deviceList = data.result;
            renderList(deviceList);
            updateMarkers(deviceList);
        })
        .catch(err => console.error("API Error:", err));
}
loadData();
setInterval(loadData, REFRESH_INTERVAL);

/* ============================
   LIST KENDARAAN + SEARCH
=============================== */
function renderList(devices) {
    let html = "";
    devices.forEach(d => {
        html += `
            <div class="item" onclick="selectDevice('${d.imei}')">
                <b>${d.name || d.plate_number || d.imei}</b><br>
                Status: ${d.st}<br>
                <small>${d.address}</small>
            </div>`;
    });
    document.getElementById("list").innerHTML = html;
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
        let latlng = [parseFloat(d.lat), parseFloat(d.lng)];
        let angle = parseFloat(d.angle || d.course || d.direction || 0);

        let icon = L.icon({
            iconUrl: d.marker,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        if (!markers[d.imei]) {
            markers[d.imei] = L.marker(latlng, {
                icon: icon,
                rotationAngle: angle,
                rotationOrigin: "center center"
            })
            .addTo(map)
            .on("click", () => showDetail(d));

        } else {
            markers[d.imei].setLatLng(latlng);
            markers[d.imei].setIcon(icon);
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

    let marker = markers[imei];
    if (marker) {
        map.setView(marker.getLatLng(), 18);
    }

    showDetail(d);
}

/* ============================
   TAMPILKAN DETAIL PANEL
=============================== */
function showDetail(d) {
    document.getElementById("detailContent").innerHTML = `
        <b>${d.name}</b><br><br>
        <b>IMEI:</b> ${d.imei}<br>
        <b>Status:</b> ${d.st}<br>
        <b>Speed:</b> ${d.speed} km/h<br>
        <b>Last Update:</b> ${d.dt_tracker}<br><br>
        <b>Address:</b><br>${d.address}<br><br>
        <b>Latitude:</b> ${d.lat}<br>
        <b>Longitude:</b> ${d.lng}
    `;
}

/* ============================
   COLLAPSIBLE SIDEBAR
=============================== */
function toggleSidebar() {
    let sb = document.getElementById("sidebar");
    sb.classList.toggle("hidden");

    document.getElementById("toggleBtn").innerHTML =
        sb.classList.contains("hidden") ? "⮞ Show Panel" : "⮜ Hide Panel";
}
</script>

@endpush
