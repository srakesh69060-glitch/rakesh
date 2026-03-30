const locateBtn = document.getElementById("locateMeBtn");
const locateOutput = document.getElementById("locateMeOutput");
const locateLink = document.getElementById("locateMeLink");

if (locateBtn) {
    locateBtn.addEventListener("click", () => {
        locateOutput.textContent = "Fetching location...";
        if (!navigator.geolocation) {
            locateOutput.textContent = "Geolocation is not supported by this browser.";
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                locateOutput.textContent = `Current location: ${coords}`;
                locateLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
            },
            () => {
                locateOutput.textContent = "Unable to fetch location. Please allow location access.";
            }
        );
    });
}
