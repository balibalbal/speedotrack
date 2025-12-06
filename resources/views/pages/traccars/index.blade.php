<!DOCTYPE html>
<html>
<head>
    <title>GPS Tracking Map</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">

    <style>
        body { margin:0; font-family: Arial; }
        #wrapper { display: flex; height: 100vh; }

        /* Sidebar kiri */
        #sidebar {
            width: 300px;
            background: #fff;
            border-right: 1px solid #ddd;
            overflow-y: auto;
            transition: 0.3s;
        }
        #sidebar.hidden {
            width: 0;
            padding: 0;
            overflow: hidden;
        }

        #toggleBtn {
            background: #333;
            color: #fff;
            padding: 8px;
            cursor: pointer;
            text-align: center;
        }

        #searchInput {
            width: 95%;
            padding: 8px;
            margin: 8px;
        }

        .item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
        }
        .item:hover { background: #f1f1f1; }

        /* Panel detail kanan */
        #detailPanel {
            width: 300px;
            background: #fafafa;
            border-left: 1px solid #ddd;
            padding: 10px;
            overflow-y: auto;
        }

        #map { flex: 1; }
    </style>
</head>

<body>

<div id="wrapper">

    <!-- Sidebar kiri -->
    <div id="sidebar">
        <div id="toggleBtn" onclick="toggleSidebar()">⮜ Hide Panel</div>
        <input type="text" id="searchInput" placeholder="Cari kendaraan..." onkeyup="filterList()">
        <div id="list">Loading...</div>
    </div>

    <!-- Peta -->
    <div id="map"></div>

    <!-- Panel Detail Kanan -->
    <div id="detailPanel">
        <h3>Detail Kendaraan</h3>
        <div id="detailContent">Klik marker untuk melihat detail...</div>
    </div>

</div>


<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>

// =============================
// KONFIGURASI
// =============================
const URL_API = "https://www.speedotrack.pro/api/api.php?ver=1.0&api=mobile&key=767C31DD0734097600A75E0712FF7C5F&cmd=USER_GET_OBJECTS&page=1&rows=500"; // GANTI
const REFRESH_INTERVAL = 5000; // 5 DETIK

var map = L.map('map').setView([-6.4, 106.63], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var markers = {};  
var deviceList = []; 


// =============================
// AMBIL DATA API + REFRESH MARKER
// =============================
function loadData() {
    fetch(URL_API)
        .then(res => res.json())
        .then(data => {
            deviceList = data.result;
            renderList(deviceList);
            updateMarkers(deviceList);
        })
        .catch(err => console.error(err));
}

loadData();
setInterval(loadData, REFRESH_INTERVAL);


// =============================
// TAMPILKAN LIST + SEARCH
// =============================
function renderList(devices) {
    let html = "";
    devices.forEach(d => {
        html += `
            <div class="item" onclick="focusDevice('${d.imei}')">
                <b>${d.name || d.plate_number || d.imei}</b><br>
                Status: ${d.st}<br>
                <small>${d.address}</small>
            </div>
        `;
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


// =============================
// MARKER DENGAN WARNA STATUS
// =============================
function getMarkerIcon(status) {
    let color = "gray";

    if (status === "Moving") color = "blue";
    else if (status === "Stopped") color = "red";
    else if (status === "Online") color = "green";
    else if (status === "Offline") color = "gray";

    return L.icon({
        iconUrl: `https://cdn-icons-png.flaticon.com/512/684/${color === "green" ? "684908" :
                                                  color === "blue" ? "684907" :
                                                  color === "red" ? "684912" :
                                                  "684908"}.png`,
        iconSize: [30, 30],
    });
}


// =============================
// UPDATE MARKER TANPA CLEAR SEMUA
// =============================
function updateMarkers(devices) {
    devices.forEach(d => {
        let latlng = [parseFloat(d.lat), parseFloat(d.lng)];

        if (!markers[d.imei]) {
            // buat marker baru
            markers[d.imei] = L.marker(latlng, { icon: getMarkerIcon(d.st) })
                .addTo(map)
                .on("click", () => showDetail(d));
        } else {
            // update posisi + icon
            markers[d.imei].setLatLng(latlng);
            markers[d.imei].setIcon(getMarkerIcon(d.st));
        }
    });
}


// =============================
// FOKUS KE KENDARAAN (LIST → MAP)
// =============================
function focusDevice(imei) {
    let m = markers[imei];
    if (m) {
        map.setView(m.getLatLng(), 18);
        m.openPopup();
    }
}


// =============================
// TAMPIL DETAIL KENDARAAN DI PANEL KANAN
// =============================
function showDetail(d) {
    document.getElementById("detailContent").innerHTML = `
        <b>${d.name}</b><br><br>
        <b>IMEI:</b> ${d.imei}<br>
        <b>Status:</b> ${d.st}<br>
        <b>Speed:</b> ${d.speed} km/h<br>
        <b>Last Update:</b> ${d.dt_tracker}<br>
        <b>Address:</b><br>${d.address}<br><br>
        <b>Latitude:</b> ${d.lat}<br>
        <b>Longitude:</b> ${d.lng}<br>
    `;
}


// =============================
// COLLAPSIBLE SIDEBAR
// =============================
function toggleSidebar() {
    let sb = document.getElementById("sidebar");
    if (sb.classList.contains("hidden")) {
        sb.classList.remove("hidden");
        document.getElementById("toggleBtn").innerHTML = "⮜ Hide Panel";
    } else {
        sb.classList.add("hidden");
    }
}

</script>
</body>
</html>
