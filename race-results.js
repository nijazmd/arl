const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

let allRaceData = [];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(raceResultsSheetURL);
    const text = await response.text();
    const rows = text.split("\n").slice(1).map(r => r.split(","));

    allRaceData = rows.map(row => {
      const [raceNo, date, driver, team, car, track, raceLevel, chances, position, points] = row.map(cell =>
        cell.replace(/"/g, '').trim()
      );

      return {
        raceNo: parseInt(raceNo, 10),
        date: formatDate(date, "YYMMDD"),
        driver,
        team,
        car,
        track,
        raceLevel,
        chances,
        position,
        points: parseInt(points, 10),
        rawDate: date
      };
    }).filter(r => !isNaN(r.raceNo) && r.driver);

    renderRaceSelector();
  } catch (err) {
    console.error("Failed to load race results:", err);
  }
});

function formatDate(rawDate) {
  const parts = rawDate.split(" ")[0].split("-");
  if (parts.length === 3) {
    return parts[0].slice(2) + parts[1] + parts[2]; // YYMMDD
  }
  return rawDate;
}

function renderRaceSelector() {
  const raceSelector = document.getElementById("race-selector");
  const raceNumbers = [...new Set(allRaceData.map(r => r.raceNo))].sort((a, b) => a - b);
  const latest = raceNumbers[raceNumbers.length - 1];

  raceSelector.innerHTML = raceNumbers.map(race => `
    <label>
      <input type="radio" name="race" value="${race}" ${race === latest ? 'checked' : ''}>
      Race ${race}
    </label>
  `).join(" ");

  document.querySelectorAll('input[name="race"]').forEach(radio => {
    radio.addEventListener("change", e => renderRaceCards(parseInt(e.target.value, 10)));
  });

  renderRaceCards(latest);
}

function renderRaceCards(selectedRace) {
  const container = document.getElementById("race-cards");
  const filtered = allRaceData.filter(r => r.raceNo === selectedRace);
  const sorted = filtered.sort((a, b) => b.points - a.points);

  container.innerHTML = sorted.map(driver => `
    <div class="race-card">
  <div class="race-date">${driver.date}</div>

  <div class="race-pair">
    <div class="pair">
      <div class="label">Driver</div>
      <div class="value">${driver.driver}</div>
    </div>
    <div class="pair">
      <div class="label">Team</div>
      <div class="value">${driver.team || "—"}</div>
    </div>
  </div>

  <div class="race-pair">
    <div class="pair">
      <div class="label">Track</div>
      <div class="value">${driver.track}</div>
    </div>
    <div class="pair">
      <div class="label">Car</div>
      <div class="value">${driver.car}</div>
    </div>
  </div>

  <div class="race-pair">
    <div class="pair">
      <div class="label">Level</div>
      <div class="value">${driver.raceLevel}</div>
    </div>
    <div class="pair">
      <div class="label">Chances</div>
      <div class="value">${driver.chances}</div>
    </div>
  </div>

  <div class="race-pair">
    <div class="pair">
      <div class="label">Position</div>
      <div class="value">${driver.position}</div>
    </div>
    <div class="pair">
      <div class="label">Points</div>
      <div class="value dominant">${driver.points}</div>
    </div>
  </div>
</div>

  `).join("");
}
