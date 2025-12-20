const URL_API = "/api/objects"; // dari route web karena api dari luar
const REFRESH_INTERVAL = 5000;

// const GOOGLE_KEY = "{{ config('services.google_map.api_key') }}";

let markers = {};
let deviceList = [];
let selectedImei = null;

let map;
let currentStatusFilter = 'moving';
let activeFilter = 'all';


document.addEventListener("DOMContentLoaded", function () {

    /* INIT MAP GLOBAL */
    map = L.map('map').setView([-6.4, 106.63], 12);

    let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        .addTo(map);

    /* GOOGLE LAYER */
    setTimeout(() => {
        let g_roadmap  = L.gridLayer.googleMutant({ type: 'roadmap' });
        let g_satellite = L.gridLayer.googleMutant({ type: 'satellite' });
        let g_hybrid = L.gridLayer.googleMutant({ type: 'hybrid' });
        let g_terrain = L.gridLayer.googleMutant({ type: 'terrain' });

        L.control.layers({
            "OSM": osm,
            "Google Roadmap": g_roadmap,
            "Google Satellite": g_satellite,
            "Google Hybrid": g_hybrid,
            "Google Terrain": g_terrain
        }).addTo(map);
    }, 150);

    /* LOAD DATA */
    loadData();
    // setInterval(loadData, REFRESH_INTERVAL);

    /* RESIZE MAP */
    window.addEventListener('resize', () => map.invalidateSize());
});


// Cache untuk marker icons untuk performa
let iconCache = {};

/* ============================
   LOAD DATA
=============================== */
function loadData() {
    fetch(URL_API)
        .then(res => res.json())
        .then(data => {
            if (data.result) {
                deviceList = data.result;

                updateCounters(deviceList);

                const filtered = getFilteredDevices();
                renderList(filtered);
                updateMarkers(filtered);
            }
        })

        .catch(err => console.error("API Error:", err));
}

function updateCounters(devices) {
    // document.getElementById('vehicleCount').textContent = devices.length;
    
    const activeCount = devices.filter(d => d.st === 'moving' || d.st === 'running').length;
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
        const isActive = selectedImei === d.imei;
        const status = normalizeStatus(d); // moving | idle | stop
        
        html += `
            <div class="vehicle-item ${isActive ? 'active' : ''}" onclick="selectDevice('${d.imei}')">
                <div class="vehicle-name">${d.name || d.plate_number || d.imei}</div>
                <div class="vehicle-status">
                    <span class="badge ${getStatusBadge(status)}">
                        ${status.toUpperCase()}
                    </span>
                    ${d.speed ? `<span class="ms-2">${d.speed} km/h</span>` : ''}
                </div>
                <div class="vehicle-location">
                    ${d.address || 'Lokasi tidak diketahui'}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

function getStatusBadge(status) {
    switch(status) {
        case 'Moving':
            return 'bg-success';
        case 'running':
            return 'bg-primary';
        case 'Stopped':
            return 'bg-warning';
        case 'Offline':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
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
   UPDATE MARKER DENGAN URL DARI API
=============================== */
function updateMarkers(devices) {
    devices.forEach(d => {
        let lat = parseFloat(d.lat);
        let lng = parseFloat(d.lng);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        let latlng = [lat, lng];
        let angle = parseFloat(d.angle || d.course || d.direction || 0);

        // Gunakan marker dari API jika ada, jika tidak gunakan default berdasarkan status
        let markerUrl = d.marker || getDefaultMarkerByStatus(d.st);
        
        // Cache key untuk icon
        let cacheKey = `${markerUrl}_${angle}_${selectedImei === d.imei ? 'selected' : 'normal'}`;
        
        // Buat icon dengan URL dari API
        let icon = createIcon(markerUrl, angle, d.imei);

        if (!markers[d.imei]) {
            markers[d.imei] = L.marker(latlng, {
                icon: icon,
                rotationAngle: angle,
                rotationOrigin: "center center",
                title: d.name || d.imei
            })
            .addTo(map)
            .on("click", () => selectDevice(d.imei));
            
            // Tambahkan popup untuk marker
            markers[d.imei].bindPopup(createMarkerPopup(d));
            
        } else {
            markers[d.imei].setLatLng(latlng);
            markers[d.imei].setRotationAngle(angle);
            markers[d.imei].setIcon(icon);
            
            // Update popup
            markers[d.imei].setPopupContent(createMarkerPopup(d));
        }
    });
}

function createIcon(markerUrl, angle, imei) {
    // Jika kendaraan dipilih, buat icon lebih besar
    const isSelected = selectedImei === imei;
    const sizeMultiplier = isSelected ? 1.2 : 1.0;
    
    return L.icon({
        iconUrl: markerUrl,
        iconSize: [30 * sizeMultiplier, 40 * sizeMultiplier],
        iconAnchor: [15 * sizeMultiplier, 40 * sizeMultiplier],
        popupAnchor: [0, -40 * sizeMultiplier]
    });
}

function getDefaultMarkerByStatus(status) {
    // Fallback marker berdasarkan status jika tidak ada di API
    const baseUrl = 'https://speedotrack.pro//img/markers/';
    
    switch(status) {
        case 'moving':
        case 'running':
            return baseUrl + 'arrow-green.svg';
        case 'stopped':
            return baseUrl + 'arrow-yellow.svg';
        case 'offline':
            return baseUrl + 'arrow-grey.svg';
        default:
            return baseUrl + 'arrow-red.svg'; // Default dari contoh Anda
    }
}

function createMarkerPopup(d) {
    return `
        <div style="min-width: 200px;">
            <strong>${d.plate_number || 'Tanpa Nama'}</strong><br>
            <small>${d.imei || 'No. Imei: -'}</small><br>
            <hr style="margin: 5px 0;">
            <table style="font-size: 12px;">
                <tr>
                    <td>Status:</td>
                    <td><b>${d.ststr}</b></td>
                </tr>
                <tr>
                    <td>Kecepatan:</td>
                    <td><b>${d.speed || 0} km/h</b></td>
                </tr>
                <tr>
                    <td>Terakhir:</td>
                    <td>${formatTime(d.dt_tracker)}</td>
                </tr>
            </table>
            <button onclick="selectRouteDeviceFromMap('${d.imei}')" 
                    style="margin-top: 8px; padding: 4px 12px; font-size: 12px;"
                    class="btn btn-sm btn-primary w-100">
                Historical
            </button>
        </div>
    `;
}

function selectRouteDeviceFromMap(imei) {
    // Tutup popup
    // if (markers[imei]) {
    //     markers[imei].closePopup();
    // }

    // Redirect ke histories index + kirim imei
    window.location.href = `/histories?imei=${encodeURIComponent(imei)}`;
}


function formatTime(dt) {
    if (!dt) return '-';
    const date = new Date(dt);
    return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/* ============================
   KLIK LIST → MAP + DETAIL
=============================== */
function selectDevice(imei) {
    selectedImei = imei;
    let d = deviceList.find(v => v.imei == imei);
    if (!d) return;

    // Update UI
    renderList(deviceList);
    
    // Update semua marker untuk reflect selection
    updateMarkers(deviceList);
    
    // Buka panel detail jika tertutup
    const detailPanel = document.getElementById("detailPanel");
    if (detailPanel.classList.contains("hidden")) {
        toggleSidebarRight();
    }

    // Zoom ke marker
    let marker = markers[imei];
    if (marker) {
        map.setView(marker.getLatLng(), 16);
        marker.openPopup();
    }

    showDetail(d);
}

/* ============================
   TAMPILKAN DETAIL PANEL
=============================== */
function showDetail(d) {
    const detailContent = document.getElementById("detailContent");
    if (!detailContent) return;
    
    // Dapatkan URL marker untuk ditampilkan di detail
    const markerUrl = d.marker || getDefaultMarkerByStatus(d.st);
    
    detailContent.innerHTML = `
        <div class="detail-section">
            <div class="text-center mb-3">
                <div style="display: inline-block; transform: rotate(${d.angle || 0}deg);">
                    <img src="${markerUrl}" alt="Marker" style="width: 40px; height: 40px;">
                </div>
                <h6 class="mt-2">${d.name || 'Tidak ada nama'}</h6>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">IMEI</div>
                <div class="detail-value">${d.imei}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Nomor Polisi</div>
                <div class="detail-value">${d.plate_number || '-'}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="badge ${getStatusBadge(d.st)}">${d.ststr}</span>
                </div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Kecepatan</div>
                <div class="detail-value">${d.speed || 0} km/h</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Arah</div>
                <div class="detail-value">
                    <div style="display: flex; align-items: center;">
                        <div style="transform: rotate(${d.angle || 0}deg); margin-right: 8px;">
                            ➤
                        </div>
                        <span>${d.angle || 0}°</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Update Terakhir</div>
                <div class="detail-value">${formatDateTime(d.dt_tracker)}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Alamat</div>
                <div class="detail-value">${d.address || '-'}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Koordinat</div>
                <div class="detail-value">${d.lat}, ${d.lng}</div>
            </div>
        </div>
    `;
}

function formatDateTime(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleString('id-ID', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}


/* ============================
   COLLAPSIBLE SIDEBAR
=============================== */
function toggleSidebarLeft() {
    const sidebar = document.getElementById("sidebar");
    const arrow = document.getElementById("leftArrow");
    
    sidebar.classList.toggle("hidden");
    
    if (sidebar.classList.contains("hidden")) {
        arrow.innerHTML = "▶";
    } else {
        arrow.innerHTML = "◀";
    }
    
    setTimeout(() => map.invalidateSize(), 300);
}

function toggleSidebarRight() {
    const detailPanel = document.getElementById("detailPanel");
    const arrow = document.getElementById("rightArrow");
    
    detailPanel.classList.toggle("hidden");
    
    if (detailPanel.classList.contains("hidden")) {
        arrow.innerHTML = "◀";
    } else {
        arrow.innerHTML = "▶";
    }
    
    setTimeout(() => map.invalidateSize(), 300);
}

function normalizeStatus(d) {
    if (d.st === 'moving' || d.speed > 3) return 'moving';
    if (d.st === 'idle' || (d.speed > 0 && d.speed <= 3)) return 'idle';
    return 'stop';
}
function updateCounters(devices) {
    document.getElementById('count-all').textContent = devices.length;
    document.getElementById('count-moving').textContent =
        devices.filter(d => normalizeStatus(d) === 'moving').length;

    document.getElementById('count-idle').textContent =
        devices.filter(d => normalizeStatus(d) === 'idle').length;

    document.getElementById('count-stop').textContent =
        devices.filter(d => normalizeStatus(d) === 'stop').length;
}

function getFilteredDevices() {
    if (activeFilter === 'all') {
        return deviceList;
    }

    return deviceList.filter(d => normalizeStatus(d) === activeFilter);
}


document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentStatusFilter = btn.dataset.status;

        const filtered = getFilteredDevices();
        renderList(filtered);
        updateMarkers(filtered);
    });
});

function getStatusBadge(status) {
    switch(status) {
        case 'moving': return 'bg-success';
        case 'idle': return 'bg-primary';
        case 'stop': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

function setFilter(filter) {
    activeFilter = filter;

    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document
        .querySelector(`.status-tab[data-filter="${filter}"]`)
        .classList.add('active');

    const filtered = getFilteredDevices();
    renderList(filtered);
    updateMarkers(filtered);
}
