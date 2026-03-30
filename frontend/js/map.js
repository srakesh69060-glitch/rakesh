let map;
const ambulanceMarkers = new Map();
const hospitalMarkers = new Map();
const emergencyMarkers = new Map();
const ambulanceTrails = new Map();
const ambulanceAccuracyCircles = new Map();
const emergencyAccuracyCircles = new Map();
const mapStatus = document.getElementById("mapStatus");
const mapLastUpdated = document.getElementById("mapLastUpdated");
const refreshNowBtn = document.getElementById("refreshNow");

const INDIA_BOUNDS = {
    minLat: 6.0,
    maxLat: 37.5,
    minLng: 68.0,
    maxLng: 97.5,
};

function isInIndia(lat, lng) {
    return (
        typeof lat === "number" &&
        typeof lng === "number" &&
        lat >= INDIA_BOUNDS.minLat &&
        lat <= INDIA_BOUNDS.maxLat &&
        lng >= INDIA_BOUNDS.minLng &&
        lng <= INDIA_BOUNDS.maxLng
    );
}

function parseLatLng(text) {
    const parts = text.split(",").map((p) => p.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
}

function formatTime(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
}

function formatSpeed(speedMps) {
    if (speedMps === null || speedMps === undefined || Number.isNaN(speedMps)) return "N/A";
    const kmh = speedMps * 3.6;
    return `${kmh.toFixed(1)} km/h`;
}

function formatHeading(headingDeg) {
    if (headingDeg === null || headingDeg === undefined || Number.isNaN(headingDeg)) return "N/A";
    return `${headingDeg.toFixed(0)}°`;
}

function initMap() {
    const bounds = L.latLngBounds(
        [INDIA_BOUNDS.minLat, INDIA_BOUNDS.minLng],
        [INDIA_BOUNDS.maxLat, INDIA_BOUNDS.maxLng]
    );

    map = L.map("map", {
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
    }).setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    }).addTo(map);

    if (refreshNowBtn) {
        refreshNowBtn.addEventListener("click", () => refreshMap(true));
    }

    refreshMap(true);
    setInterval(refreshMap, 5000);
}

async function refreshMap(forceFit = false) {
    setStatus(mapStatus, "Refreshing locations...");

    try {
        const [ambulancesData, hospitalsData, emergenciesData] = await Promise.all([
            apiFetch("/ambulances"),
            apiFetch("/hospitals"),
            apiFetch("/emergencies"),
        ]);

        const ambulances = ambulancesData.ambulances || [];
        const hospitals = hospitalsData.hospitals || [];
        const emergencies = emergenciesData.emergencies || [];

        updateAmbulances(ambulances);
        updateHospitals(hospitals);
        updateEmergencies(emergencies);

        setStatus(
            mapStatus,
            `Tracking ${ambulances.length} ambulances, ${hospitals.length} hospitals, ${emergencies.length} emergencies.`
        );
        if (mapLastUpdated) {
            mapLastUpdated.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
        }

        fitBoundsIfNeeded();
    } catch (error) {
        setStatus(mapStatus, error.message, true);
    }
}

function fitBoundsIfNeeded() {
    if (!map) return;

    const group = L.featureGroup();
    ambulanceMarkers.forEach((marker) => group.addLayer(marker));
    hospitalMarkers.forEach((marker) => group.addLayer(marker));
    emergencyMarkers.forEach((marker) => group.addLayer(marker));

    if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 12 });
        return;
    }

    map.setView([20.5937, 78.9629], 5);
}

function updateAmbulances(ambulances) {
    const activeIds = new Set();

    ambulances.forEach((ambulance) => {
        activeIds.add(ambulance.id);
        const lat = Number(ambulance.current_lat);
        const lng = Number(ambulance.current_lng);
        const position = [lat, lng];

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return;
        }

        if (!isInIndia(lat, lng)) {
            return;
        }

        if (ambulanceMarkers.has(ambulance.id)) {
            ambulanceMarkers.get(ambulance.id).setLatLng(position);
            updateTrail(ambulance.id, position);
            updateAccuracyCircle(ambulanceAccuracyCircles, ambulance.id, position, ambulance.accuracy_m, "#3b82f6");
            return;
        }

        const marker = L.circleMarker(position, {
            radius: 7,
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.9,
        }).addTo(map);
        marker.bindPopup(
            `Ambulance ${ambulance.id} - ${ambulance.driver_name}<br />Status: ${ambulance.status}<br />Speed: ${formatSpeed(
                ambulance.speed_mps
            )}<br />Heading: ${formatHeading(ambulance.heading_deg)}<br />Last update: ${formatTime(ambulance.updated_at)}`
        );
        ambulanceMarkers.set(ambulance.id, marker);
        updateTrail(ambulance.id, position, true);
        updateAccuracyCircle(ambulanceAccuracyCircles, ambulance.id, position, ambulance.accuracy_m, "#3b82f6");
    });

    ambulanceMarkers.forEach((marker, id) => {
        if (!activeIds.has(id)) {
            map.removeLayer(marker);
            ambulanceMarkers.delete(id);
        }
    });

    ambulanceTrails.forEach((trail, id) => {
        if (!activeIds.has(id)) {
            map.removeLayer(trail.line);
            ambulanceTrails.delete(id);
        }
    });

    ambulanceAccuracyCircles.forEach((circle, id) => {
        if (!activeIds.has(id)) {
            map.removeLayer(circle);
            ambulanceAccuracyCircles.delete(id);
        }
    });
}

function updateTrail(ambulanceId, position, first = false) {
    const existing = ambulanceTrails.get(ambulanceId);
    if (!existing) {
        const points = [position];
        const line = L.polyline(points, { color: "#3b82f6", weight: 2, opacity: 0.5 }).addTo(map);
        ambulanceTrails.set(ambulanceId, { points, line });
        return;
    }

    if (!first) {
        const last = existing.points[existing.points.length - 1];
        if (last && last[0] === position[0] && last[1] === position[1]) {
            return;
        }
    }

    existing.points.push(position);
    if (existing.points.length > 10) {
        existing.points.shift();
    }
    existing.line.setLatLngs(existing.points);
}

function updateAccuracyCircle(store, id, position, accuracy, color) {
    const accuracyValue = Number(accuracy);
    if (Number.isNaN(accuracyValue) || accuracyValue <= 0) {
        if (store.has(id)) {
            map.removeLayer(store.get(id));
            store.delete(id);
        }
        return;
    }

    if (store.has(id)) {
        store.get(id).setLatLng(position);
        store.get(id).setRadius(accuracyValue);
        return;
    }

    const circle = L.circle(position, {
        radius: accuracyValue,
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.08,
    }).addTo(map);
    store.set(id, circle);
}

function updateHospitals(hospitals) {
    const activeIds = new Set();

    hospitals.forEach((hospital) => {
        activeIds.add(hospital.id);
        const position = parseLatLng(hospital.location);
        if (!position) return;
        if (!isInIndia(position.lat, position.lng)) return;

        if (hospitalMarkers.has(hospital.id)) {
            hospitalMarkers.get(hospital.id).setLatLng([position.lat, position.lng]);
            return;
        }

        const marker = L.circleMarker([position.lat, position.lng], {
            radius: 7,
            color: "#15803d",
            fillColor: "#22c55e",
            fillOpacity: 0.9,
        }).addTo(map);
        marker.bindPopup(`Hospital: ${hospital.name}<br />District: ${hospital.district}`);
        hospitalMarkers.set(hospital.id, marker);
    });

    hospitalMarkers.forEach((marker, id) => {
        if (!activeIds.has(id)) {
            map.removeLayer(marker);
            hospitalMarkers.delete(id);
        }
    });
}

function updateEmergencies(emergencies) {
    const activeIds = new Set();

    emergencies.forEach((emergency) => {
        activeIds.add(emergency.id);
        const position = parseLatLng(emergency.location);
        if (!position) return;
        if (!isInIndia(position.lat, position.lng)) return;

        if (emergencyMarkers.has(emergency.id)) {
            emergencyMarkers.get(emergency.id).setLatLng([position.lat, position.lng]);
            updateAccuracyCircle(
                emergencyAccuracyCircles,
                emergency.id,
                [position.lat, position.lng],
                emergency.accuracy_m,
                "#ef4444"
            );
            return;
        }

        const marker = L.circleMarker([position.lat, position.lng], {
            radius: 8,
            color: "#b91c1c",
            fillColor: "#ef4444",
            fillOpacity: 0.95,
        }).addTo(map);
        marker.bindPopup(
            `Emergency ${emergency.id} - ${emergency.emergency_type}<br />Patient: ${emergency.patient_name}`
        );
        emergencyMarkers.set(emergency.id, marker);
        updateAccuracyCircle(
            emergencyAccuracyCircles,
            emergency.id,
            [position.lat, position.lng],
            emergency.accuracy_m,
            "#ef4444"
        );
    });

    emergencyMarkers.forEach((marker, id) => {
        if (!activeIds.has(id)) {
            map.removeLayer(marker);
            emergencyMarkers.delete(id);
        }
    });

    emergencyAccuracyCircles.forEach((circle, id) => {
        if (!activeIds.has(id)) {
            map.removeLayer(circle);
            emergencyAccuracyCircles.delete(id);
        }
    });
}

document.addEventListener("DOMContentLoaded", initMap);
