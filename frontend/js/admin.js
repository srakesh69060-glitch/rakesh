const hospitalForm = document.getElementById("hospitalForm");
const ambulanceForm = document.getElementById("ambulanceForm");
const hospitalStatus = document.getElementById("hospitalStatus");
const ambulanceStatus = document.getElementById("ambulanceStatus");

const hospitalList = document.getElementById("hospitalList");
const ambulanceList = document.getElementById("ambulanceList");
const hospitalDistrictSelect = document.getElementById("hospitalDistrict");

async function loadDistricts() {
    try {
        const data = await apiFetch("/districts");
        hospitalDistrictSelect.innerHTML = data.districts
            .map((d) => `<option value="${d}">${d}</option>`)
            .join("");
    } catch (error) {
        setStatus(hospitalStatus, error.message, true);
    }
}

async function loadHospitals() {
    try {
        const data = await apiFetch("/hospitals");
        hospitalList.innerHTML = "";
        data.hospitals.forEach((hospital) => {
            const div = document.createElement("div");
            div.className = "list-item";
            div.textContent = `${hospital.id} - ${hospital.name} (${hospital.district})`;
            hospitalList.appendChild(div);
        });
    } catch (error) {
        hospitalList.innerHTML = `<div class="list-item">${error.message}</div>`;
    }
}

async function loadAmbulances() {
    try {
        const data = await apiFetch("/ambulances");
        ambulanceList.innerHTML = "";
        data.ambulances.forEach((ambulance) => {
            const div = document.createElement("div");
            div.className = "list-item";
            div.textContent = `${ambulance.id} - ${ambulance.driver_name} (${ambulance.status})`;
            ambulanceList.appendChild(div);
        });
    } catch (error) {
        ambulanceList.innerHTML = `<div class="list-item">${error.message}</div>`;
    }
}

hospitalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(hospitalStatus, "Creating hospital...");

    const formData = new FormData(hospitalForm);
    const payload = {
        name: formData.get("name"),
        district: formData.get("district"),
        location: formData.get("location"),
        contact: formData.get("contact"),
    };

    try {
        await apiFetch("/hospital", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        setStatus(hospitalStatus, "Hospital created.");
        hospitalForm.reset();
        loadHospitals();
    } catch (error) {
        setStatus(hospitalStatus, error.message, true);
    }
});

ambulanceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(ambulanceStatus, "Creating ambulance...");

    const formData = new FormData(ambulanceForm);
    const payload = {
        driver_name: formData.get("driver_name"),
        current_lat: Number(formData.get("current_lat")),
        current_lng: Number(formData.get("current_lng")),
        status: formData.get("status"),
    };

    try {
        await apiFetch("/ambulance", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        setStatus(ambulanceStatus, "Ambulance created.");
        ambulanceForm.reset();
        loadAmbulances();
    } catch (error) {
        setStatus(ambulanceStatus, error.message, true);
    }
});

loadDistricts();
loadHospitals();
loadAmbulances();
