let map;
let routeLatLngs = [];
let routeMeta = [];
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

/* ===== CHART ===== */
let speedChart;
let speedData = [];
let speedLabels = [];

/* =========================
   INIT MAP
========================= */
function initMap() {
    map = L.map('map').setView([-6.2, 106.8], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
}

/* =========================
   SPEED CHART
========================= */
function initSpeedChart() {
    const canvas = document.getElementById('speedChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    speedData = routeMeta.map(m => m.speed || 0);
    speedLabels = routeMeta.map((_, i) => i + 1);

    speedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: speedLabels,
            datasets: [{
                data: speedData,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0,
                borderColor: '#0d6efd',
                fill: false
            }]
        },
        options: {
            responsive: true,
            animation: false,

            interaction: {
                mode: 'index',
                intersect: false
            },

            scales: {
                x: { display: false },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 10 }
                }
            },

            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: ctx => {
                            const i = ctx.dataIndex;
                            const m = routeMeta[i];
                            return `Speed ${m.speed} km/h | ${m.time}`;
                        }
                    }
                }
            }
        }
    });

    // 🔥 SCRUB HOVER HANDLER (INI KUNCI NYA)
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;

        const percent = x / rect.width;
        const index = Math.round(percent * (routeLatLngs.length - 1));

        if (index < 0 || index >= routeLatLngs.length) return;

        pauseRoute();          // stop animation
        jumpToPoint(index);    // marker lompat
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

    const res = await fetch(url);
    const text = await res.text();
    if (!text) return alert('Response kosong');

    let json;
    try { json = JSON.parse(text); }
    catch { return alert('Response bukan JSON'); }

    if (!json.route?.length) return alert('Route kosong');

    parseRoute(json.route);
    drawRoute();
    addStartEndMarker();
    initMovingMarker();
    initSpeedChart();
}

/* =========================
   PARSE ROUTE
========================= */
function parseRoute(route) {
    routeLatLngs = [];
    routeMeta = [];

    route.forEach(r => {
        const lat = parseFloat(r[1]);
        const lng = parseFloat(r[2]);
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
   MAP DRAW
========================= */
function drawRoute() {
    routePolyline = L.polyline(routeLatLngs, {
        color: '#007bff',
        weight: 4
    }).addTo(map);

    map.fitBounds(routePolyline.getBounds());
}

function addStartEndMarker() {
    startMarker = L.marker(routeLatLngs[0], {
        icon: greenIcon()
    }).addTo(map).bindPopup('🟢 Start');

    endMarker = L.marker(routeLatLngs.at(-1), {
        icon: redIcon()
    }).addTo(map).bindPopup('🔴 End');
}

function initMovingMarker() {
    movingMarker = L.marker(routeLatLngs[0], {
        rotationAngle: routeMeta[0].angle,
        rotationOrigin: 'center',
        icon: blueIcon()
    }).addTo(map);
}

/* =========================
   PLAY CONTROL
========================= */
function playRoute() {
    if (isPlaying || !routeLatLngs.length) return;
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

        movingMarker.setLatLng([lat, lng]);
        movingMarker.setRotationAngle(meta.angle);

        updateInfo(meta, toIndex);
        highlightChart(toIndex);

        if (followMode) map.panTo([lat, lng], { animate: false });
        if (step >= smoothStep) clearInterval(interval);
    }, playSpeed / smoothStep);
}

/* =========================
   JUMP (HOVER CHART)
========================= */
function jumpToPoint(index) {
    playIndex = index;

    const latlng = routeLatLngs[index];
    const meta = routeMeta[index];

    movingMarker.setLatLng(latlng);
    movingMarker.setRotationAngle(meta.angle);

    updateInfo(meta, index);
    highlightChart(index);

    if (followMode) map.panTo(latlng);
}

/* =========================
   UI UPDATE
========================= */
function updateInfo(meta, index) {
    document.getElementById('infoPanel').innerHTML = `
        <b>IMEI:</b> ${IMEI}<br>
        <b>Point:</b> ${index + 1}/${routeLatLngs.length}<br>
        <b>Speed:</b> ${meta.speed} km/h<br>
        <b>Time:</b> ${meta.time}
    `;
}

function highlightChart(index) {
    if (!speedChart) return;
    speedChart.setActiveElements([{ datasetIndex: 0, index }]);
    speedChart.update('none');
}

/* =========================
   UTIL
========================= */
function toggleFollow() {
    followMode = !followMode;
    document.getElementById('followBtn').innerText =
        followMode ? '📍 Follow ON' : '📍 Follow OFF';
}

function setSpeed(val) {
    playSpeed = parseInt(val);
}

function reloadRoute() {
    const s = startDate.value;
    const e = endDate.value;
    if (!s || !e) return alert('Pilih tanggal');

    loadRoute(`/histories/route?imei=${IMEI}&start=${s}&end=${e}`);
}

function clearMap() {
    [routePolyline, movingMarker, startMarker, endMarker]
        .forEach(l => l && map.removeLayer(l));

    if (speedChart) speedChart.destroy();

    routeLatLngs = [];
    routeMeta = [];
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
    const today = new Date().toISOString().split('T')[0];
    startDate.value = today;
    endDate.value = today;
}
