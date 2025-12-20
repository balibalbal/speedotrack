async function loadRouteHistory() {
    const res = await fetch(`/histories/route?imei=${IMEI}`);
    const json = await res.json();

    if (!json.route) {
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

    if (latlngs.length === 0) return;

    const polyline = L.polyline(latlngs, {
        weight: 4,
        opacity: 0.9
    }).addTo(map);

    map.fitBounds(polyline.getBounds());
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof IMEI !== 'undefined') {
        loadRouteHistory();
    }
});
