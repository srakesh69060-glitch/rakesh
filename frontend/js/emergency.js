const form = document.getElementById("emergencyForm");
const statusEl = document.getElementById("emergencyStatus");
const locationInput = document.getElementById("location");
const locationBtn = document.getElementById("getLocation");
const districtSelect = document.getElementById("district");
const statusLookupForm = document.getElementById("statusLookupForm");
const statusResult = document.getElementById("statusResult");
const locationOutput = document.getElementById("locationOutput");
const locationLink = document.getElementById("locationLink");

const patientEmergencyId = document.getElementById("patientEmergencyId");
const startPatientTracking = document.getElementById("startPatientTracking");
const stopPatientTracking = document.getElementById("stopPatientTracking");
const patientLocation = document.getElementById("patientLocation");
const patientTrackingStatus = document.getElementById("patientTrackingStatus");

let patientWatchId = null;

async function loadDistricts() {
    try {
        const data = await apiFetch("/districts");
        districtSelect.innerHTML = data.districts
            .map((d) => `<option value="${d}">${d}</option>`)
            .join("");
    } catch (error) {
        setStatus(statusEl, error.message, true);
    }
}

locationBtn.addEventListener("click", () => {
    setStatus(statusEl, "Fetching location...");

    if (!navigator.geolocation) {
        setStatus(statusEl, "Geolocation is not supported by this browser.", true);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            locationInput.value = coords;
            if (locationOutput) {
                locationOutput.textContent = `Current location: ${coords} (±${Math.round(accuracy)}m)`;
            }
            if (locationLink) {
                locationLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
            }
            setStatus(statusEl, "Location captured.");
        },
        () => {
            setStatus(statusEl, "Unable to fetch location. Please allow location access.", true);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(statusEl, "Sending emergency request...");

    const formData = new FormData(form);
    const payload = {
        patient_name: formData.get("patient_name"),
        patient_phone: formData.get("patient_phone"),
        district: formData.get("district"),
        emergency_type: formData.get("emergency_type"),
        location: formData.get("location"),
        notes: formData.get("notes"),
    };

    try {
        const data = await apiFetch("/emergency", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        const hospital = data.suggested_hospital
            ? ` Suggested hospital: ${data.suggested_hospital.name}.`
            : "";
        setStatus(statusEl, `Emergency request sent. ID: ${data.emergency_id}.${hospital}`);
        form.reset();
        locationInput.value = "";
        if (locationOutput) {
            locationOutput.textContent = "Location not captured yet.";
        }
    } catch (error) {
        setStatus(statusEl, error.message, true);
    }
});

statusLookupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusResult.textContent = "Checking status...";

    const formData = new FormData(statusLookupForm);
    const emergencyId = formData.get("emergency_id");

    try {
        const data = await apiFetch(`/emergency/${encodeURIComponent(emergencyId)}`);
        const emergency = data.emergency;
        statusResult.innerHTML = `
            <strong>Status:</strong> ${emergency.status}<br />
            <strong>Hospital:</strong> ${emergency.hospital_name || "Pending"}<br />
            <strong>Ambulance:</strong> ${emergency.ambulance_driver || "Pending"}<br />
            <strong>Report:</strong> ${emergency.report_text || "Not available"}
        `;
    } catch (error) {
        statusResult.textContent = error.message;
    }
});

function setPatientStatus(message, isError = false) {
    if (!patientTrackingStatus) return;
    patientTrackingStatus.textContent = message;
    patientTrackingStatus.style.color = isError ? "#b91c1c" : "#4b5563";
}

function startPatientLiveTracking() {
    const emergencyId = Number(patientEmergencyId.value);
    if (!emergencyId) {
        setPatientStatus("Enter a valid emergency ID.", true);
        return;
    }

    if (!navigator.geolocation) {
        setPatientStatus("Geolocation is not supported by this browser.", true);
        return;
    }

    setPatientStatus("Starting patient tracking...");

    patientWatchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            if (patientLocation) {
                patientLocation.textContent = `Live location: ${coords} (±${Math.round(accuracy)}m)`;
            }

            try {
                await apiFetch("/emergency/location", {
                    method: "POST",
                    body: JSON.stringify({
                        emergency_id: emergencyId,
                        location: coords,
                        accuracy_m: accuracy,
                    }),
                });
                setPatientStatus("Patient location updated.");
            } catch (error) {
                setPatientStatus(error.message, true);
            }
        },
        () => {
            setPatientStatus("Unable to fetch GPS. Allow location access.", true);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
}

function stopPatientLiveTracking() {
    if (patientWatchId !== null) {
        navigator.geolocation.clearWatch(patientWatchId);
        patientWatchId = null;
        setPatientStatus("Tracking stopped.");
    }
}

if (startPatientTracking) {
    startPatientTracking.addEventListener("click", startPatientLiveTracking);
}
if (stopPatientTracking) {
    stopPatientTracking.addEventListener("click", stopPatientLiveTracking);
}

loadDistricts();
