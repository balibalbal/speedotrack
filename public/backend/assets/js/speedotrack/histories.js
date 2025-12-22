let map;
let baseLayers;
let routeLatLngs = [];
let routeMeta = [];
let routePolyline;
let movingMarker;
let startMarker;
let endMarker;
let pulseScale = 1;
let pulseDir = 1;
let pulseRAF = null;

/* ===== PLAY STATE ===== */
let playIndex = 0;
let isPlaying = false;
let followMode = true;
let currentAngle = 0;
let animationRAF = null;

/* ===== CHART ===== */
let speedChart;
let speedData = [];
let speedLabels = [];

/* ===== LOADING ===== */
let loadingEl;

let isScrubbing = false;
let allowHoverJump = true;
let progressBar;
let isScrubbingProgress = false;

const infoPanel = document.getElementById('infoPanel');
const followBtn = document.getElementById('followBtn');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');

/* =========================
   INIT MAP
========================= */
function initMap() {
    map = L.map('map', { center: [-6.2, 106.8], zoom: 10 });

    // OSM
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Google Layers
    const googleRoadmap = L.gridLayer.googleMutant({ type: 'roadmap' });
    const googleSatellite = L.gridLayer.googleMutant({ type: 'satellite' });
    const googleHybrid = L.gridLayer.googleMutant({ type: 'hybrid' });

    baseLayers = {
        "OpenStreetMap": osm,
        "Google Roadmap": googleRoadmap,
        "Google Satellite": googleSatellite,
        "Google Hybrid": googleHybrid
    };

    // Layer switcher
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

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
const showLoading = () => loadingEl && (loadingEl.style.display = 'flex');
const hideLoading = () => loadingEl && (loadingEl.style.display = 'none');

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
                pointRadius: ctx => ctx.dataIndex === playIndex ? 6 * pulseScale : 0,
                pointBackgroundColor: ctx =>
                    ctx.dataIndex === playIndex ? 'rgba(255,0,0,1)' : 'transparent',
                pointBorderColor: ctx =>
                    ctx.dataIndex === playIndex ? 'rgba(255,0,0,0.8)' : 'transparent',
                pointBorderWidth: 2,
                borderColor: '#0d6efd'
            }]
        },
        options: {
            animation: false,
            interaction: { mode: 'index', intersect: false },
            scales: { x: { display: false }, y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    canvas.addEventListener('mousedown', e => {
        isScrubbing = true;
        allowHoverJump = true;
        pauseRoute();

        const index = getIndexFromEvent(e, canvas);
        if (index !== null) jumpToPoint(index);
    });

    canvas.addEventListener('mousemove', e => {
        if (!isScrubbing || !allowHoverJump) return;

        const index = getIndexFromEvent(e, canvas);
        if (index !== null) jumpToPoint(index);
    });

    document.addEventListener('mouseup', () => isScrubbing = false);

    canvas.addEventListener('click', e => {
        const index = getIndexFromEvent(e, canvas);
        if (index === null) return;

        pauseRoute();
        jumpToPoint(index);
        playRoute(); // ▶ auto play dari titik klik
    });

    startPulse();
}

function startPulse() {
    if (pulseRAF) cancelAnimationFrame(pulseRAF);

    function animate() {
        pulseScale += pulseDir * 0.03;
        if (pulseScale >= 1.4) pulseDir = -1;
        if (pulseScale <= 1.0) pulseDir = 1;

        if (speedChart) speedChart.update('none');

        pulseRAF = requestAnimationFrame(animate);
    }

    animate();
}

/* =========================
   LOAD ROUTE
========================= */
async function loadRoute(url) {
    clearMap();
    showLoading();

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (!json.route || json.route.length === 0) {
            hideLoading();
            progressBar.value = 0;
            progressBar.max = 0;
            showEmptyInfo();
            console.warn('Route kosong');
            return;
        }

        parseRoute(json.route);
        drawRoute();
        addStartEndMarker();
        initMovingMarker();
        initSpeedChart();

        progressBar.max = routeLatLngs.length - 1;
        progressBar.value = 0;

    } catch (err) {
        console.error(err);
        alert('Gagal load route');
    } finally {
        hideLoading();
    }
}

function loadRouteToday() {
    return loadRoute(`/histories/route?imei=${IMEI}`);
}

function showEmptyInfo() {
    infoPanel.innerHTML = `
        <div class="text-muted text-center">
            Tidak ada data perjalanan<br>
            Silakan pilih tanggal lain
        </div>
    `;
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
            angle: r[3] || 0
        });
    });
}

/* =========================
   DRAW POLYLINE
========================= */
function drawRoute() {
    routePolyline = L.polyline(routeLatLngs, { color: '#0d6efd', weight: 4, opacity: 0.9 }).addTo(map);
    map.fitBounds(routePolyline.getBounds());
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
    movingMarker = L.marker(routeLatLngs[0], { icon: blueIcon(), rotationAngle: currentAngle, rotationOrigin: 'center' }).addTo(map);
}

/* =========================
   PLAYBACK OPTIMIZED
========================= */
function playRoute() {
    if (isPlaying || !routeLatLngs.length) return;

    isPlaying = true;
    allowHoverJump = false;

    const stepSize = routeLatLngs.length > 1000 ? 5 : 1;

    function step() {
        if (playIndex >= routeLatLngs.length - 1) {
            isPlaying = false;
            return;
        }

        const nextIndex = Math.min(playIndex + stepSize, routeLatLngs.length - 1);

        const latLng = L.latLng(routeLatLngs[nextIndex]);
        movingMarker.setLatLng(latLng);
        movingMarker.setRotationAngle(routeMeta[nextIndex].angle);
        currentAngle = routeMeta[nextIndex].angle;

        if (followMode && (nextIndex % 10 === 0 || nextIndex === routeLatLngs.length - 1)) {
            map.panTo(latLng, { animate: false });
        }

        updateInfo(routeMeta[nextIndex], nextIndex);
        progressBar.value = nextIndex;

        playIndex = nextIndex;
        animationRAF = requestAnimationFrame(step);
    }

    animationRAF = requestAnimationFrame(step);
}

function pauseRoute() {
    isPlaying = false;
    allowHoverJump = true;
    if (animationRAF) cancelAnimationFrame(animationRAF);
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

    progressBar.value = index;
}

/* =========================
   UI / INFO
========================= */
function updateInfo(meta, index) {
    infoPanel.innerHTML = `
        <b>Speed:</b> ${meta.speed} km/h<br>
        <b>Time:</b> ${meta.time}<br>
        <b>Point:</b> ${index + 1}/${routeLatLngs.length}
    `;
}

function highlightChart(index) {
    playIndex = index;
}

/* =========================
   UTIL
========================= */
function toggleFollow() {
    followMode = !followMode;
    followBtn.innerText = followMode ? '📍 Follow ON' : '📍 Follow OFF';
}

function setSpeedLevel(level) {
    const map = { 1: { delay: 2000, label: '0.5x' }, 2: { delay: 1200, label: '0.75x' }, 3: { delay: 600, label: '1x' }, 4: { delay: 300, label: '1.5x' }, 5: { delay: 150, label: '2x' } };
    const cfg = map[level];
    document.getElementById('speedLabel').innerText = cfg.label;
}

/* =========================
   ROUTE CONTROL
========================= */
function reloadRoute() {
    loadRoute(`/histories/route?imei=${IMEI}&start=${startDate.value}&end=${endDate.value}`);
}

function clearMap() {
    [routePolyline, movingMarker, startMarker, endMarker].forEach(l => l && map.removeLayer(l));
    if (speedChart) speedChart.destroy();
    playIndex = 0;
    pauseRoute();
}

function toJakartaTime(ts) {
    return new Date(ts.replace(' ', 'T') + 'Z').toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

/* =========================
   ICONS
========================= */
const greenIcon = () => L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', iconSize: [32,32] });
const redIcon = () => L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', iconSize: [32,32] });
const blueIcon = () => L.icon({ iconUrl: 'backend/assets/img/illustrations/default.png', iconSize: [32,32] });

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setDefaultDates();

    progressBar = document.getElementById('progressBar');
    progressBar.addEventListener('input', e => { isScrubbingProgress = true; pauseRoute(); jumpToPoint(+e.target.value); });
    progressBar.addEventListener('change', () => isScrubbingProgress = false);

    if (IMEI) loadRouteToday();
});

function setDefaultDates() {
    const t = new Date().toISOString().split('T')[0];
    startDate.value = t;
    endDate.value = t;
}

function goStart() { pauseRoute(); jumpToPoint(0); }
function goEnd() { pauseRoute(); jumpToPoint(routeLatLngs.length - 1); }

function getIndexFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    if (percent < 0 || percent > 1) return null;
    return Math.round(percent * (routeLatLngs.length - 1));
}
