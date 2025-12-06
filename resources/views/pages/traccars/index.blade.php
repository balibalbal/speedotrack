@push('style')

    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">

    <style>
        html, body {
    height: 100%;
    margin: 0;
    padding: 0;
}

/* ===== WRAPPER FULL HEIGHT ===== */
.wrapper {
    position: absolute;
    top: 56px; /* sesuaikan tinggi header admin */
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    overflow: hidden;
}

/* ===== SIDEBAR KIRI ===== */
#sidebar {
    width: 320px;
    background: #fff;
    border-right: 1px solid #ddd;
    overflow-y: auto;
    transition: .3s;
    position: relative;
    z-index: 20;
}
#sidebar.hidden {
    width: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
}

/* Tombol kiri */
#toggleSidebarLeft {
    position: absolute;
    top: 50%;
    right: -14px;
    transform: translateY(-50%);
    background: #2c3e50;
    color: #fff;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 0 5px 5px 0;
    z-index: 30;
    font-size: 14px;
}

/* ===== SEARCH ===== */
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

/* ===== MAP AREA ===== */
/* #map {
    flex: 1;
    height: 100%;
    z-index: 1;
} */

#map {
    position: relative;
    z-index: 1 !important;
}


/* ===== PANEL DETAIL KANAN ===== */
#detailPanel {
    width: 320px;
    background: #fafafa;
    border-left: 1px solid #ddd;
    padding: 15px;
    overflow-y: auto;
    transition: .3s;
    position: relative;
    z-index: 20;
}
#detailPanel.hidden {
    width: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
}

/* Tombol kanan */
#toggleSidebarRight {
    position: absolute;
    top: 50%;
    left: -14px;
    transform: translateY(-50%);
    background: #2c3e50;
    color: #fff;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 5px 0 0 5px;
    z-index: 30;
    font-size: 14px;
}

#toggleSidebarLeft,
#toggleSidebarRight {
    z-index: 99999 !important;
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
            <div id="toggleSidebarLeft" onclick="toggleSidebarLeft()">⮜</div>
            <input type="text" id="searchInput" placeholder="Cari kendaraan..." onkeyup="filterList()">
            <div id="list">Loading...</div>
        </div>

        <!-- MAP -->
        <div id="map"></div>

        <!-- Panel kanan -->
        <div id="detailPanel">
            <div id="toggleSidebarRight" onclick="toggleSidebarRight()">⮞</div>
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
                ${d.ststr}<br>
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
        <b>Last Update:</b> ${d.dt_tracker}<br>
        <b>Note:</b> ${d.ststr}<br><br>
        <b>Address:</b><br>${d.address}<br><br>
        <b>Latitude:</b> ${d.lat}<br>
        <b>Longitude:</b> ${d.lng}
    `;
}

/* ============================
   COLLAPSIBLE SIDEBAR
=============================== */
function toggleSidebarLeft() {
    const sb = document.getElementById("sidebar");
    const btn = document.getElementById("toggleSidebarLeft");

    sb.classList.toggle("hidden");

    btn.innerHTML = sb.classList.contains("hidden") ? "⮞" : "⮜";
}

function toggleSidebarRight() {
    const dp = document.getElementById("detailPanel");
    const btn = document.getElementById("toggleSidebarRight");

    dp.classList.toggle("hidden");

    btn.innerHTML = dp.classList.contains("hidden") ? "⮜" : "⮞";
}

</script>

@endpush
