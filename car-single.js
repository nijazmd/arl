const carParam = new URLSearchParams(window.location.search).get("car");
const carsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2855635&single=true&output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

document.addEventListener("DOMContentLoaded", async () => {
  if (!carParam) {
    document.getElementById("car-name-heading").textContent = "No car selected.";
    return;
  }

  document.getElementById("car-name-heading").textContent = decodeURIComponent(carParam);

  const [carsCSV, resultsCSV] = await Promise.all([
    fetch(carsSheetURL).then(r => r.text()),
    fetch(raceResultsSheetURL).then(r => r.text())
  ]);

  const carRows = carsCSV.split("\n").map(row => row.split(",").map(cell => cell.replace(/"/g, '').trim()));
  const carHeaders = carRows[0];
  const carData = carRows.slice(1);

  const col = (name) => carHeaders.indexOf(name);
  const imageColExists = col("ImageURL") !== -1;

  const carRow = carData.find(row => row[col("CarName")] === carParam);

  if (!carRow) {
    document.getElementById("car-info").innerHTML = `<p>Car not found in Cars sheet.</p>`;
    return;
  }

  const carName = carRow[col("CarName")];
  const carMake = carRow[col("CarMake")];
  const year = carRow[col("Year")];
  const pp = carRow[col("PP")];
  const type = carRow[col("Type")];
  const country = carRow[col("Country")];
  const imageUrl = imageColExists ? carRow[col("ImageURL")] : "";

  document.getElementById("car-info").innerHTML = `
    ${imageUrl ? `<img src="${imageUrl}" alt="${carName}" class="car-image-large" />` : ""}
    <div><span class="label">Make:</span> <span class="value">${carMake}</span></div>
    <div><span class="label">Name:</span> <span class="value">${carName}</span></div>
    <div><span class="label">PP:</span> <span class="value">${pp}</span></div>
    <div><span class="label">Type:</span> <span class="value">${type || "—"}</span></div>
    <div><span class="label">Country:</span> <span class="value">${country || "—"}</span></div>
  `;

  // Parse stats from RaceResults
  const raceRows = resultsCSV.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
  const headers = raceRows[0];
  const colRes = (name) => headers.indexOf(name);
  const dataRows = raceRows.slice(1);

  const races = dataRows.filter(row => row[colRes("Car")] === carParam);
  const totalRaces = races.length;
  const firstPlaces = races.filter(r => r[colRes("Position")] === "1").length;
  const podiums = races.filter(r => ["1", "2", "3"].includes(r[colRes("Position")])).length;
  const avgPos = (races.reduce((sum, r) => sum + parseInt(r[colRes("Position")] || "0"), 0) / totalRaces).toFixed(2);
  const firstPct = ((firstPlaces / totalRaces) * 100).toFixed(1);
  const podiumPct = ((podiums / totalRaces) * 100).toFixed(1);

  document.getElementById("car-stats").innerHTML = `
    <h3>Race Stats</h3>
    <div class="stat-pairs">
      <div class="pair"><div class="label">Total Races</div><div class="value">${totalRaces}</div></div>
      <div class="pair"><div class="label">1st Places</div><div class="value">${firstPlaces}</div></div>
      <div class="pair"><div class="label">Podiums</div><div class="value">${podiums}</div></div>
      <div class="pair"><div class="label">Avg. Position</div><div class="value">${avgPos}</div></div>
      <div class="pair"><div class="label">1st Place %</div><div class="value">${firstPct}%</div></div>
      <div class="pair"><div class="label">Podium %</div><div class="value">${podiumPct}%</div></div>
    </div>
  `;

  const rating = carRow[col("Rating")] || "—";

// Check if the car has done at least one Level 5 race
const hasLevel5Race = races.some(r => r[colRes("RaceLevel")] === "5");

const ratingClass = hasLevel5Race ? "rating-bright" : "rating-muted";

const ratingDiv = document.createElement("div");
ratingDiv.innerHTML = `
  <span class="label">Rating:</span>
  <span id="car-rating" class="${ratingClass}">${rating}</span>
  <a href="#" id="rate-link" class="rate-link">rate</a>
`;
document.getElementById("car-info").appendChild(ratingDiv);

document.getElementById("rate-link").addEventListener("click", (e) => {
  e.preventDefault();
  const newRating = prompt("Enter new rating for this car:");
  if (!newRating) return;

  // POST to your Google Apps Script backend (requires implementation)
  const webAppUrl = "https://script.google.com/macros/s/AKfycbwLxrhusbzSJWL3kuHtG0x_gdjyjzFF8RBu3HipatIlpgy_Sa2HwUu-EuFbG6m5J1Lc7A/exec";

fetch(webAppUrl, {
  method: "POST",
  body: new URLSearchParams({
    mode: "rate",        // tells doPost this is a rating update
    carName: carParam,
    rating: newRating
  })
}).then(() => {
    document.getElementById("car-rating").textContent = newRating;
    alert("Rating updated!");
  }).catch(() => alert("Failed to update rating."));
});

});
