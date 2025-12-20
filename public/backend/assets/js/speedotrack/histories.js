let map;

function initMap() {
    map = L.map('map').setView([-6.2, 106.8], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
}

async function loadRouteHistory() {
    console.log('Loading route for:', IMEI);

    const res = await fetch(`/histories/route?imei=${IMEI}`);
    const json = await res.json();

    if (!json.route || json.route.length === 0) {
        alert('Data route tidak tersedia');
        return;
    }

    drawRoute(json.route);
}

function drawRoute(routeData) {
    const latlngs = [];

    routeData.forEach(row => {
        const lat = parseFloat(row[1]);
        const lng = parseFloat(row[2]);

        if (!isNaN(lat) && !isNaN(lng)) {
            latlngs.push([lat, lng]);
        }
    });

    if (!latlngs.length) return;

    const polyline = L.polyline(latlngs, {
        weight: 4,
        opacity: 0.9
    }).addTo(map);

    map.fitBounds(polyline.getBounds());
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();

    if (typeof IMEI !== 'undefined' && IMEI) {
        loadRouteHistory();
    }
});
