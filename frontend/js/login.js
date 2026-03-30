const form = document.getElementById("loginForm");
const statusEl = document.getElementById("loginStatus");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(statusEl, "Logging in...");

    const formData = new FormData(form);
    const payload = {
        phone: formData.get("phone"),
        password: formData.get("password"),
    };

    try {
        const data = await apiFetch("/login", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        saveUser(data.user);
        setStatus(statusEl, "Login successful. Redirecting...");
        setTimeout(() => {
            window.location.href = "emergency.html";
        }, 800);
    } catch (error) {
        setStatus(statusEl, error.message, true);
    }
});
