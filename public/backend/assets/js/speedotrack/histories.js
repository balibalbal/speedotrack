let map;
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

let isScrubbing = false;     // mouse sedang geser chart
let allowHoverJump = true;  // disable saat play
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

const showLoading = () => loadingEl && (loadingEl.style.display = 'flex');
const hideLoading = () => loadingEl && (loadingEl.style.display = 'none');


/* =========================
   SPEED CHART
========================= */
// function initSpeedChart() {
//     const canvas = document.getElementById('speedChart');
//     if (!canvas) return;

//     speedData = routeMeta.map(m => m.speed);
//     speedLabels = routeMeta.map((_, i) => i + 1);

//     const glowPointPlugin = {
//         id: 'glowPoint',
//         afterDatasetDraw(chart, args) {
//             const { ctx } = chart;
//             const active = chart.getActiveElements();

//             if (!active.length) return;

//             const { datasetIndex, index } = active[0];
//             const meta = chart.getDatasetMeta(datasetIndex);
//             const point = meta.data[index];

//             if (!point) return;

//             ctx.save();

//             // ✨ glow effect
//             ctx.beginPath();
//             ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);

//             ctx.fillStyle = '#dc3545';   
//             ctx.shadowColor = '#dc3545';
//             ctx.shadowBlur = 15;
//             ctx.fill();

//             ctx.restore();
//         }
//     };


//     speedChart = new Chart(canvas, {
//         type: 'line',
//         data: {
//             labels: speedLabels,
//             datasets: [{
//                 data: speedData,
//                 borderWidth: 2,
//                 tension: 0.3,

//                 pointRadius: 0,
//                 pointHoverRadius: 0,

//                 borderColor: '#0d6efd'
//             }]

//         },
//         options: {
//             animation: false,
//             interaction: { mode: 'index', intersect: false },
//             scales: {
//                 x: { display: false },
//                 y: { beginAtZero: true }
//             },
//             plugins: {
//                 legend: { display: false }
//             }
//         },
//         plugins: [glowPointPlugin]
//     });

//     canvas.addEventListener('mousedown', e => {
//         isScrubbing = true;
//         allowHoverJump = true;
//         pauseRoute();

//         const index = getIndexFromEvent(e, canvas);
//         if (index !== null) jumpToPoint(index);
//     });

//     canvas.addEventListener('mousemove', e => {
//         if (!isScrubbing) return;
//         if (!allowHoverJump) return;

//         const index = getIndexFromEvent(e, canvas);
//         if (index !== null) jumpToPoint(index);
//     });

//     document.addEventListener('mouseup', () => {
//         isScrubbing = false;
//     });

//     canvas.addEventListener('click', e => {
//         const index = getIndexFromEvent(e, canvas);
//         if (index === null) return;

//         pauseRoute();
//         jumpToPoint(index);
//         playRoute(); // ▶ auto play dari titik klik
//     });


// }

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
                pointRadius: ctx =>
                    ctx.dataIndex === playIndex
                        ? (isPlaying ? 8 * pulseScale : 6)
                        : 0,

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
            scales: {
                x: { display: false },
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    startPulse();
}

function startPulse() {
    if (pulseRAF) cancelAnimationFrame(pulseRAF);

    function animate() {
        pulseScale += pulseDir * 0.03;

        if (pulseScale >= 1.4) pulseDir = -1;
        if (pulseScale <= 1.0) pulseDir = 1;

        if (speedChart) {
            speedChart.update('none');
        }

        pulseRAF = requestAnimationFrame(animate);
    }

    animate();
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
    drawRoute();
    addStartEndMarker();
    initMovingMarker();
    initSpeedChart();

    hideLoading();

    progressBar.max = routeLatLngs.length - 1;
    progressBar.value = 0;

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
   Draw POLYLINE satu warna
========================= */
function drawRoute() {
    routePolyline = L.polyline(routeLatLngs, {
        color: '#0d6efd',   // satu warna (bootstrap blue)
        weight: 4,
        opacity: 0.9
    }).addTo(map);

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
    if (isPlaying || !routeLatLngs.length) return;

    isPlaying = true;
    allowHoverJump = false; // 🔥 MATIKAN HOVER

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
    allowHoverJump = true; // hidupkan lagi
    clearInterval(playInterval);
}

function getIndexFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const percent = x / rect.width;
    if (percent < 0 || percent > 1) return null;

    return Math.round(percent * (routeLatLngs.length - 1));
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
        // highlightChart(toIndex);
        playIndex = toIndex;

        if (followMode) map.panTo([lat, lng], { animate: false });
        if (step >= smoothStep) clearInterval(interval);

        progressBar.value = toIndex;
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

    progressBar.value = index;
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

// function highlightChart(index) {
//     if (!speedChart) return;

//     speedChart.setActiveElements([
//         { datasetIndex: 0, index }
//     ]);
//     speedChart.update('none');
// }

function highlightChart(index) {
    playIndex = index;
}



// function highlightChart(index) {
//     if (!speedChart) return;

//     speedChart.setActiveElements([
//         { datasetIndex: 0, index }
//     ]);

//     // 🔥 paksa redraw point aktif
//     speedChart.tooltip.setActiveElements(
//         [{ datasetIndex: 0, index }],
//         { x: 0, y: 0 }
//     );

//     speedChart.update('none');
// }


/* =========================
   UTIL
========================= */
function toggleFollow() {
    followMode = !followMode;
    followBtn.innerText = followMode ? '📍 Follow ON' : '📍 Follow OFF';
}

function setSpeedLevel(level) {
    const map = {
        1: { delay: 2000, label: '0.5x' },
        2: { delay: 1200, label: '0.75x' },
        3: { delay: 600,  label: '1x' },
        4: { delay: 300,  label: '1.5x' },
        5: { delay: 150,  label: '2x' }
    };

    const cfg = map[level];
    playSpeed = cfg.delay;

    document.getElementById('speedLabel').innerText = cfg.label;

    if (isPlaying) {
        pauseRoute();
        playRoute();
    }
}


function reloadRoute() {
    loadRoute(`/histories/route?imei=${IMEI}&start=${startDate.value}&end=${endDate.value}`);
}
function clearMap() {
    [routePolyline, movingMarker, startMarker, endMarker]
        .forEach(l => l && map.removeLayer(l));
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

    progressBar = document.getElementById('progressBar');

    progressBar.addEventListener('input', e => {
        isScrubbingProgress = true;
        pauseRoute();
        jumpToPoint(+e.target.value);
    });

    progressBar.addEventListener('change', () => {
        isScrubbingProgress = false;
    });

    if (IMEI) loadRouteToday();
});

function setDefaultDates() {
    const t = new Date().toISOString().split('T')[0];
    startDate.value = t;
    endDate.value = t;
}

function goStart() {
    pauseRoute();
    jumpToPoint(0);
}

function goEnd() {
    pauseRoute();
    jumpToPoint(routeLatLngs.length - 1);
}

