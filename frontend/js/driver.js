const startBtn = document.getElementById("startTracking");
const stopBtn = document.getElementById("stopTracking");
const ambulanceIdInput = document.getElementById("ambulanceId");
const ambulanceStatus = document.getElementById("ambulanceStatus");
const driverLocation = document.getElementById("driverLocation");
const driverStatus = document.getElementById("driverStatus");

let watchId = null;

function updateStatus(message, isError = false) {
    driverStatus.textContent = message;
    driverStatus.style.color = isError ? "#b91c1c" : "#4b5563";
}

function startTracking() {
    const ambulanceId = Number(ambulanceIdInput.value);
    if (!ambulanceId) {
        updateStatus("Enter a valid ambulance ID.", true);
        return;
    }

    if (!navigator.geolocation) {
        updateStatus("Geolocation is not supported by this browser.", true);
        return;
    }

    updateStatus("Starting GPS tracking...");

    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude, accuracy, speed, heading } = position.coords;
            driverLocation.textContent = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)} (±${Math.round(
                accuracy
            )}m)`;

            try {
                await apiFetch("/update_ambulance", {
                    method: "POST",
                    body: JSON.stringify({
                        ambulance_id: ambulanceId,
                        current_lat: latitude,
                        current_lng: longitude,
                        status: ambulanceStatus.value,
                        accuracy_m: accuracy,
                        speed_mps: speed,
                        heading_deg: heading,
                    }),
                });
                updateStatus("Location sent.");
            } catch (error) {
                updateStatus(error.message, true);
            }
        },
        () => {
            updateStatus("Unable to fetch GPS. Allow location access.", true);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        updateStatus("Tracking stopped.");
    }
}

startBtn.addEventListener("click", startTracking);
stopBtn.addEventListener("click", stopTracking);
