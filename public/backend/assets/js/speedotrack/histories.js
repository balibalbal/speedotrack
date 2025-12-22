let map;
let routeLatLngs = [];
let routeMeta = [];
let routeSegments = [];
let routePolyline;
let movingMarker;
let startMarker;
let endMarker;

/* ===== PLAY STATE ===== */
let playIndex = 0;
let playInterval = null;
let playSpeed = 500;
let smoothStep = 10;
let isPlaying = false;
let followMode = true;
let currentAngle = 0;

/* ===== CHART ===== */
let speedChart;
let speedData = [];
let speedLabels = [];

/* ===== LOADING ===== */
let loadingEl;

/* =========================
   INIT MAP
========================= */
function initMap() {
    map = L.map('map').setView([-6.2, 106.8], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    initLoading();
}

/* =========================
   LOADING SPINNER
========================= */
function initLoading() {
    loadingEl = document.createElement('div');
    loadingEl.innerHTML = `
        <div style="
            position:absolute;inset:0;
            background:rgba(255,255,255,.7);
            display:flex;align-items:center;justify-content:center;
            z-index:9999">
            <div class="spinner-border text-primary"></div>
        </div>`;
    document.getElementById('map').appendChild(loadingEl);
    hideLoading();
}
const showLoading = () => loadingEl.style.display = 'flex';
const hideLoading = () => loadingEl.style.display = 'none';

/* =========================
   SPEED CHART
========================= */
function initSpeedChart() {
    const canvas = document.getElementById('speedChart');
    if (!canvas) return;

    speedData = routeMeta.map(m => m.speed);
    speedLabels = routeMeta.map((_, i) => i + 1);

    speedChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: speedLabels,
            datasets: [{
                data: speedData,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0,
                borderColor: '#0d6efd'
            }]
        },
        options: {
            animation: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { display: false },
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const index = Math.round(percent * (routeLatLngs.length - 1));
        if (index >= 0 && index < routeLatLngs.length) {
            pauseRoute();
            jumpToPoint(index);
        }
    });
}

/* =========================
   LOAD ROUTE
========================= */
async function loadRouteToday() {
    await loadRoute(`/histories/route?imei=${IMEI}`);
}

async function loadRoute(url) {
    clearMap();
    showLoading();

    const res = await fetch(url);
    const json = await res.json();

    if (!json.route?.length) {
        hideLoading();
        return alert('Route kosong');
    }

    parseRoute(json.route);
    drawGradientRoute();
    addStartEndMarker();
    initMovingMarker();
    initSpeedChart();

    hideLoading();
}

/* =========================
   PARSE ROUTE
========================= */
function parseRoute(route) {
    routeLatLngs = [];
    routeMeta = [];

    route.forEach(r => {
        const lat = +r[1], lng = +r[2];
        if (isNaN(lat) || isNaN(lng)) return;

        routeLatLngs.push([lat, lng]);
        routeMeta.push({
            time: toJakartaTime(r[0]),
            speed: r[5] || 0,
            angle: r[4] || 0
        });
    });
}

/* =========================
   SPEED GRADIENT POLYLINE
========================= */
function drawGradientRoute() {
    routeSegments = [];

    for (let i = 0; i < routeLatLngs.length - 1; i++) {
        const speed = routeMeta[i].speed;
        const color =
            speed < 20 ? '#0d6efd' :
            speed < 60 ? '#ffc107' :
            '#dc3545';

        const seg = L.polyline(
            [routeLatLngs[i], routeLatLngs[i + 1]],
            { color, weight: 4, opacity: 0.9 }
        ).addTo(map);

        routeSegments.push(seg);
    }

    map.fitBounds(routeSegments[0].getBounds());
}

/* =========================
   MARKERS
========================= */
function addStartEndMarker() {
    startMarker = L.marker(routeLatLngs[0], { icon: greenIcon() }).addTo(map);
    endMarker = L.marker(routeLatLngs.at(-1), { icon: redIcon() }).addTo(map);
}

function initMovingMarker() {
    currentAngle = routeMeta[0].angle;

    movingMarker = L.marker(routeLatLngs[0], {
        icon: blueIcon(),
        rotationAngle: currentAngle,
        rotationOrigin: 'center'
    }).addTo(map);
}

/* =========================
   PLAYBACK
========================= */
function playRoute() {
    if (isPlaying) return;
    isPlaying = true;

    playInterval = setInterval(() => {
        if (playIndex >= routeLatLngs.length - 1) {
            pauseRoute();
            return;
        }
        animateMove(playIndex, playIndex + 1);
        playIndex++;
    }, playSpeed);
}

function pauseRoute() {
    isPlaying = false;
    clearInterval(playInterval);
}

function animateMove(fromIndex, toIndex) {
    const from = L.latLng(routeLatLngs[fromIndex]);
    const to = L.latLng(routeLatLngs[toIndex]);
    const meta = routeMeta[toIndex];
    let step = 0;

    const interval = setInterval(() => {
        step++;
        const lat = from.lat + (to.lat - from.lat) * step / smoothStep;
        const lng = from.lng + (to.lng - from.lng) * step / smoothStep;

        currentAngle = smoothAngle(currentAngle, meta.angle);
        movingMarker.setLatLng([lat, lng]);
        movingMarker.setRotationAngle(currentAngle);

        updateInfo(meta, toIndex);
        highlightChart(toIndex);

        if (followMode) map.panTo([lat, lng], { animate: false });
        if (step >= smoothStep) clearInterval(interval);
    }, playSpeed / smoothStep);
}

/* =========================
   SMOOTH ANGLE
========================= */
function smoothAngle(prev, next, factor = 0.25) {
    let diff = ((next - prev + 540) % 360) - 180;
    return prev + diff * factor;
}

/* =========================
   JUMP
========================= */
function jumpToPoint(index) {
    playIndex = index;
    const meta = routeMeta[index];

    currentAngle = meta.angle;
    movingMarker.setLatLng(routeLatLngs[index]);
    movingMarker.setRotationAngle(currentAngle);

    updateInfo(meta, index);
    highlightChart(index);
}

/* =========================
   UI
========================= */
function updateInfo(meta, index) {
    infoPanel.innerHTML = `
        <b>Speed:</b> ${meta.speed} km/h<br>
        <b>Time:</b> ${meta.time}<br>
        <b>Point:</b> ${index + 1}/${routeLatLngs.length}
    `;
}

function highlightChart(index) {
    speedChart.setActiveElements([{ datasetIndex: 0, index }]);
    speedChart.update('none');
}

/* =========================
   UTIL
========================= */
function toggleFollow() {
    followMode = !followMode;
    followBtn.innerText = followMode ? '📍 Follow ON' : '📍 Follow OFF';
}
function setSpeed(v) { playSpeed = +v; }
function reloadRoute() {
    loadRoute(`/histories/route?imei=${IMEI}&start=${startDate.value}&end=${endDate.value}`);
}
function clearMap() {
    [...routeSegments, routePolyline, movingMarker, startMarker, endMarker]
        .forEach(l => l && map.removeLayer(l));
    routeSegments = [];
    if (speedChart) speedChart.destroy();
    playIndex = 0;
    pauseRoute();
}
function toJakartaTime(ts) {
    return new Date(ts.replace(' ', 'T') + 'Z')
        .toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

/* =========================
   ICONS
========================= */
const greenIcon = () => L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', iconSize: [32,32] });
const redIcon = () => L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', iconSize: [32,32] });
const blueIcon = () => L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', iconSize: [32,32] });

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setDefaultDates();
    if (IMEI) loadRouteToday();
});
function setDefaultDates() {
    const t = new Date().toISOString().split('T')[0];
    startDate.value = t;
    endDate.value = t;
}
