let map;
let routeLatLngs = [];
let routeMeta = [];
let routePolyline;
let movingMarker;
let startMarker;
let endMarker;

let playIndex = 0;
let playInterval = null;
let playSpeed = 500; // ms

let isPlaying = false;
let followMode = true;
let smoothStep = 10; // makin besar makin halus

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

function initSpeedChart() {
    const ctx = document.getElementById('speedChart');
    if (!ctx) return;

    speedData = [];
    speedLabels = [];

    speedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: speedLabels,
            datasets: [{
                label: 'Speed (km/h)',
                data: speedData,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'km/h'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}


/* =========================
   AUTO LOAD HARI INI
========================= */
async function loadRouteToday() {
    console.log('Load route hari ini:', IMEI);
    await loadRoute(`/histories/route?imei=${IMEI}`);
}

/* =========================
   LOAD ROUTE GENERIC
========================= */
async function loadRoute(url) {
    clearMap();

    const res = await fetch(url);
    const text = await res.text();

    if (!text) {
        alert('Response kosong');
        return;
    }

    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        console.error(text);
        alert('Response bukan JSON');
        return;
    }

    if (!json.route || !json.route.length) {
        alert('Data route kosong');
        return;
    }

    parseRoute(json.route);
    initSpeedChart();
    drawRoute();
    addStartEndMarker();
    initMovingMarker();
}

/* =========================
   PARSE ROUTE
   row:
   [timestamp, lat, lng, speed, angle]
========================= */
function parseRoute(route) {
    routeLatLngs = [];
    routeMeta = [];

    route.forEach(r => {
        const lat = parseFloat(r[1]);
        const lng = parseFloat(r[2]);

        if (!isNaN(lat) && !isNaN(lng)) {
            routeLatLngs.push([lat, lng]);
            routeMeta.push({
                time: toJakartaTime(r[0]),
                speed: r[5] || 0,
                angle: r[4] || 0
            });

        }
    });
}

/* =========================
   DRAW POLYLINE
========================= */
function drawRoute() {
    routePolyline = L.polyline(routeLatLngs, {
        color: '#007bff',
        weight: 4,
        opacity: 0.9
    }).addTo(map);

    map.fitBounds(routePolyline.getBounds());
}

/* =========================
   START & END MARKER
========================= */
function addStartEndMarker() {
    startMarker = L.marker(routeLatLngs[0], {
        icon: L.icon({
            iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }).addTo(map).bindPopup('🟢 Start');

    endMarker = L.marker(routeLatLngs[routeLatLngs.length - 1], {
        icon: L.icon({
            iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }).addTo(map).bindPopup('🔴 End');
}

/* =========================
   MOVING MARKER
========================= */
function initMovingMarker() {
    movingMarker = L.marker(routeLatLngs[0], {
        rotationAngle: routeMeta[0].angle,
        rotationOrigin: 'center',
        icon: L.icon({
            iconUrl: '/images/car.png', // 🔥 pastikan ada
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        })
    }).addTo(map);

    movingMarker.bindTooltip('', {
        permanent: false,
        direction: 'top'
    });
}

/* =========================
   PLAY ANIMATION
========================= */
function playRoute() {
    if (!routeLatLngs.length) return;

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

        const lat = from.lat + ((to.lat - from.lat) * step / smoothStep);
        const lng = from.lng + ((to.lng - from.lng) * step / smoothStep);

        movingMarker.setLatLng([lat, lng]);
        movingMarker.setRotationAngle(meta.angle || 0);

        updateInfo(meta, toIndex);
        updateSpeedChart(meta, toIndex);

        if (followMode) {
            map.panTo([lat, lng], { animate: false });
        }

        if (step >= smoothStep) {
            clearInterval(interval);
        }
    }, playSpeed / smoothStep);
}

function updateInfo(meta, index) {
    const info = document.getElementById('infoPanel');
    if (!info) return;

    info.innerHTML = `
        <b>IMEI:</b> ${IMEI} - <b>Index:</b> ${index + 1} / ${routeLatLngs.length} - 
        <b>Speed:</b> ${meta.speed} km/h - 
        <b>Time:</b> ${meta.time}
    `;
}

function updateSpeedChart(meta, index) {
    if (!speedChart) return;

    speedLabels.push(index + 1);
    speedData.push(meta.speed || 0);

    speedChart.update('none');
}


function toggleFollow() {
    followMode = !followMode;
    document.getElementById('followBtn').innerText =
        followMode ? '📍 Follow ON' : '📍 Follow OFF';
}


/* =========================
   SPEED SLIDER
========================= */
function setSpeed(val) {
    playSpeed = parseInt(val);
}

/* =========================
   RELOAD BY DATE
========================= */
async function reloadRoute() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (!start || !end) {
        alert('Pilih tanggal');
        return;
    }

    await loadRoute(
        `/histories/route?imei=${IMEI}&start=${start}&end=${end}`
    );
}

/* =========================
   CLEAR MAP
========================= */
function clearMap() {
    if (routePolyline) map.removeLayer(routePolyline);
    if (movingMarker) map.removeLayer(movingMarker);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    
    if (speedChart) {
        speedChart.destroy();
        speedChart = null;
    }

    routeLatLngs = [];
    routeMeta = [];
    playIndex = 0;
    pauseRoute();
}

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setDefaultDates();

    if (typeof IMEI !== 'undefined' && IMEI) {
        loadRouteToday();
    }
});

/* =========================
   DEFAULT DATE
========================= */
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;
}

function toJakartaTime(timestamp) {
    // contoh timestamp: "2025-12-20 03:12:45"
    const utcDate = new Date(timestamp.replace(' ', 'T') + 'Z');

    return utcDate.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

