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

  const carRow = carsCSV.split("\n").slice(1).map(r => r.split(",").map(c => c.replace(/"/g, '').trim()))
    .find(cols => cols[0] === carParam);

  if (!carRow) {
    document.getElementById("car-info").innerHTML = `<p>Car not found in Cars sheet.</p>`;
    return;
  }

  const [carName, carMake, year, pp, type, country, imageUrl] = carRow;

  document.getElementById("car-info").innerHTML = `
    ${imageUrl ? `<img src="${imageUrl}" alt="${carName}" class="car-image-large" />` : ""}
    <div><span class="label">Make:</span> <span class="value">${carMake}</span></div>
    <div><span class="label">Name:</span> <span class="value">${carName} ${year}</span></div>
    <div><span class="label">PP:</span> <span class="value">${pp}</span></div>
    <div><span class="label">Type:</span> <span class="value">${type || "—"}</span></div>
    <div><span class="label">Country:</span> <span class="value">${country || "—"}</span></div>
  `;

  // Parse stats from RaceResults
  const raceRows = resultsCSV.split("\n").slice(1).map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
  const races = raceRows.filter(row => row[4] === carParam);

  const totalRaces = races.length;
  const firstPlaces = races.filter(r => r[8] === "1").length;
  const podiums = races.filter(r => ["1", "2", "3"].includes(r[8])).length;
  const avgPos = (races.reduce((sum, r) => sum + parseInt(r[8] || "0"), 0) / totalRaces).toFixed(2);
  const firstPct = ((firstPlaces / totalRaces) * 100).toFixed(1);
  const podiumPct = ((podiums / totalRaces) * 100).toFixed(1);

  document.getElementById("car-stats").innerHTML = `
  <h3>Race Stats</h3>
  <div class="stat-pairs">
    <div class="pair">
      <div class="label">Total Races</div>
      <div class="value">${totalRaces}</div>
    </div>
    <div class="pair">
      <div class="label">1st Places</div>
      <div class="value">${firstPlaces}</div>
    </div>
    <div class="pair">
      <div class="label">Podiums</div>
      <div class="value">${podiums}</div>
    </div>
    <div class="pair">
      <div class="label">Avg. Position</div>
      <div class="value">${avgPos}</div>
    </div>
    <div class="pair">
      <div class="label">1st Place %</div>
      <div class="value">${firstPct}%</div>
    </div>
    <div class="pair">
      <div class="label">Podium %</div>
      <div class="value">${podiumPct}%</div>
    </div>
  </div>
`;

});
