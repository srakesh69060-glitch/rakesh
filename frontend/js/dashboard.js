const emergencyList = document.getElementById("emergencyList");
const statusFilter = document.getElementById("statusFilter");
const districtFilter = document.getElementById("districtFilter");
const refreshBtn = document.getElementById("refreshEmergencies");
const dashboardStatus = document.getElementById("dashboardStatus");

const assignForm = document.getElementById("assignForm");
const assignStatus = document.getElementById("assignStatus");

const statusForm = document.getElementById("statusForm");
const statusUpdate = document.getElementById("statusUpdate");

async function loadDistricts() {
    try {
        const data = await apiFetch("/districts");
        const options = ['<option value="">All Districts</option>']
            .concat(data.districts.map((d) => `<option value="${d}">${d}</option>`))
            .join("");
        districtFilter.innerHTML = options;
    } catch (error) {
        setStatus(dashboardStatus, error.message, true);
    }
}

async function loadEmergencies() {
    setStatus(dashboardStatus, "Loading emergencies...");
    const filter = statusFilter.value;
    const district = districtFilter.value;

    try {
        const params = new URLSearchParams();
        if (filter) params.set("status", filter);
        if (district) params.set("district", district);
        const query = params.toString() ? `?${params.toString()}` : "";
        const data = await apiFetch(`/emergencies${query}`);
        renderEmergencies(data.emergencies || []);
        setStatus(dashboardStatus, `Loaded ${data.emergencies.length} emergencies.`);
    } catch (error) {
        setStatus(dashboardStatus, error.message, true);
    }
}

function renderEmergencies(items) {
    emergencyList.innerHTML = "";
    if (!items.length) {
        emergencyList.innerHTML = '<div class="list-item">No emergencies found.</div>';
        return;
    }

    items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
            <strong>#${item.id}</strong> - ${item.emergency_type} (${item.status})<br />
            Patient: ${item.patient_name} (${item.patient_phone})<br />
            District: ${item.district}<br />
            Location: ${item.location}<br />
            Hospital: ${item.hospital_name || "Pending"}<br />
            Ambulance: ${item.ambulance_driver || "Pending"}<br />
            Created: ${new Date(item.created_at).toLocaleString()}
        `;
        emergencyList.appendChild(div);
    });
}

refreshBtn.addEventListener("click", loadEmergencies);
statusFilter.addEventListener("change", loadEmergencies);
districtFilter.addEventListener("change", loadEmergencies);

assignForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(assignStatus, "Assigning resources...");

    const formData = new FormData(assignForm);
    const payload = {
        emergency_id: Number(formData.get("emergency_id")),
        ambulance_id: Number(formData.get("ambulance_id")) || null,
        hospital_id: Number(formData.get("hospital_id")) || null,
    };

    try {
        await apiFetch("/emergency/assign", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        setStatus(assignStatus, "Resources assigned.");
        assignForm.reset();
        loadEmergencies();
    } catch (error) {
        setStatus(assignStatus, error.message, true);
    }
});

statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(statusUpdate, "Updating status...");

    const formData = new FormData(statusForm);
    const payload = {
        emergency_id: Number(formData.get("emergency_id")),
        status: formData.get("status"),
        report_text: formData.get("report_text"),
    };

    try {
        await apiFetch("/emergency/status", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        setStatus(statusUpdate, "Status updated.");
        statusForm.reset();
        loadEmergencies();
    } catch (error) {
        setStatus(statusUpdate, error.message, true);
    }
});

loadDistricts().then(loadEmergencies);
