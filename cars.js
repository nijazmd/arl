const carsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2855635&single=true&output=csv";

document.addEventListener("DOMContentLoaded", async () => {
  const carListContainer = document.getElementById("car-list");

  try {
    const response = await fetch(carsSheetURL);
    const text = await response.text();
    const rows = text.split("\n").slice(1); // skip header

    const carCards = rows.map(row => {
      const [carName, carMake, year, pp, type, country, imageUrl] = row.split(",").map(s => s.replace(/"/g, "").trim());

      return `
        <div class="car-card">
          ${imageUrl ? `<img src="${imageUrl}" alt="${carName}" class="car-image" />` : ""}
          <div class="car-info">
            <div class="car-make">${carMake}</div>
            <div class="car-name">
              <a href="car-single.html?car=${encodeURIComponent(carName)}">${carName} ${year}</a>
            </div>
            <div class="car-pp">PP: ${pp}</div>
            <div class="car-meta">Type: ${type || "—"} | Country: ${country || "—"}</div>
          </div>
        </div>
      `;
    }).join("");

    carListContainer.innerHTML = carCards;

  } catch (error) {
    console.error("Failed to load car data:", error);
    carListContainer.innerHTML = "<p>Failed to load car data.</p>";
  }
});
