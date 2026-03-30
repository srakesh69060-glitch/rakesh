const API_BASE = "";

async function apiFetch(path, options = {}) {
    const opts = {
        headers: { "Content-Type": "application/json" },
        ...options,
    };

    const response = await fetch(`${API_BASE}${path}`, opts);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = data.error || "Request failed";
        throw new Error(message);
    }

    return data;
}

function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#b91c1c" : "#4b5563";
}

function saveUser(user) {
    localStorage.setItem("ers_user", JSON.stringify(user));
}

function getUser() {
    const raw = localStorage.getItem("ers_user");
    return raw ? JSON.parse(raw) : null;
}

function requireUser() {
    const user = getUser();
    if (!user) {
        window.location.href = "login.html";
    }
    return user;
}
