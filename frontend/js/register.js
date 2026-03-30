const form = document.getElementById("registerForm");
const statusEl = document.getElementById("registerStatus");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(statusEl, "Registering...");

    const formData = new FormData(form);
    const payload = {
        name: formData.get("name"),
        phone: formData.get("phone"),
        password: formData.get("password"),
    };

    try {
        await apiFetch("/register", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        setStatus(statusEl, "Registration successful. You can now login.");
        form.reset();
    } catch (error) {
        setStatus(statusEl, error.message, true);
    }
});
