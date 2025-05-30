const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";
const driversSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv";

const driverStats = {};
const driverTeams = {};

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const driverName = urlParams.get('driver');

  if (!driverName) {
    document.getElementById("driver-details-container").innerHTML = "<p>Driver not found.</p>";
    return;
  }

  await loadDriverTeams();
  await loadDriverStats();

  if (!driverStats[driverName]) {
    document.getElementById("driver-details-container").innerHTML = "<p>Driver not found.</p>";
    return;
  }

  renderDriverDetails(driverName);
  await loadDriverRaceHistory(driverName);
});

async function loadDriverTeams() {
  try {
    const response = await fetch(driversSheetURL);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
    const headers = rows[0];
    const col = (name) => headers.indexOf(name);

    rows.slice(1).forEach(row => {
      const driverName = row[col("Driver")] || "";
      const teamName = row[col("Team")] || "Unknown";
      if (driverName) driverTeams[driverName] = teamName;
    });
  } catch (error) {
    console.error("Error loading driver teams:", error);
  }
}

async function loadDriverStats() {
  try {
    const response = await fetch(raceResultsSheetURL);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
    const headers = rows[0];
    const col = (name) => headers.indexOf(name);

    const allDrivers = {}; // for ranking

    rows.slice(1).forEach(row => {
      const driverName = row[col("DriverName")];
      const raceLevelRaw = row[col("RaceLevel")];
      const points = parseInt(row[col("Points")], 10) || 0;
      const finishPosition = parseInt(row[col("Position")], 10);
      const disciplinary = parseInt(row[col("DisciplinaryPoints")], 10) || 0;

      if (!driverName) return;

      if (!driverStats[driverName]) {
        driverStats[driverName] = {
          team: driverTeams[driverName] || "Unknown",
          level1: 0, level2: 0, level3: 0, level4: 0, level5: 0,
          totalRaces: 0, totalPoints: 0, disciplinaryPoints: 0,
          firstPlace: 0, secondPlace: 0, thirdPlace: 0
        };
      }

      const stats = driverStats[driverName];
      const raceLevel = raceLevelRaw.replace(/\D/g, "");
      if (raceLevel) stats[`level${raceLevel}`]++;

      stats.totalRaces++;
      stats.totalPoints += points + disciplinary;
      stats.disciplinaryPoints += disciplinary;

      if (!isNaN(finishPosition)) {
        if (finishPosition === 1) stats.firstPlace++;
        else if (finishPosition === 2) stats.secondPlace++;
        else if (finishPosition === 3) stats.thirdPlace++;
      }

      allDrivers[driverName] = stats.totalPoints;
    });

    // Calculate position
    const ranking = Object.entries(allDrivers)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    ranking.forEach((name, i) => {
      if (driverStats[name]) {
        driverStats[name].position = i + 1;
      }
    });
  } catch (error) {
    console.error("Error loading race results:", error);
  }
}

function renderDriverDetails(driverName) {
  const stats = driverStats[driverName];
  const container = document.getElementById("driver-card-area");

  const totalPodiums = stats.firstPlace + stats.secondPlace + stats.thirdPlace;
  const firstPct = stats.totalRaces ? (stats.firstPlace / stats.totalRaces) * 100 : 0;
  const podiumPct = stats.totalRaces ? (totalPodiums / stats.totalRaces) * 100 : 0;
  const avgPoints = stats.totalRaces ? (stats.totalPoints / stats.totalRaces) : 0;
  const disciplinaryAvg = stats.totalRaces ? (stats.disciplinaryPoints / stats.totalRaces) : 0;

  container.innerHTML = `
    <div class="driver-profile-header">
      <h1 class="driver-name">${driverName}</h1>
      <h2 class="driver-team">${stats.team}</h2>
      <div class="positionFlag">🏁 ${stats.position}</strong></div>
    </div>

    <div class="driver-stat-group">
      <div class="pair"><div class="label">Total Races</div><div class="value">${stats.totalRaces}</div></div>
      <div class="pair"><div class="label">Total Points</div><div class="value">${stats.totalPoints}</div></div>
      <div class="pair"><div class="label">Total Disciplinary Pts</div><div class="value">${stats.disciplinaryPoints}</div></div>
      <div class="pair"><div class="label">Disciplinary Pt Avg</div><div class="value">${disciplinaryAvg.toFixed(2)}</div></div>
      <div class="pair"><div class="label">1st Places</div><div class="value">${stats.firstPlace}</div></div>
      <div class="pair"><div class="label">2nd Places</div><div class="value">${stats.secondPlace}</div></div>
      <div class="pair"><div class="label">3rd Places</div><div class="value">${stats.thirdPlace}</div></div>
      <div class="pair"><div class="label">Total Podiums</div><div class="value">${totalPodiums}</div></div>
      <div class="pair"><div class="label">Points Avg.</div><div class="value">${avgPoints.toFixed(2)}</div></div>
      <div class="pair"><div class="label">1st Place %</div><div class="value">${firstPct.toFixed(1)}%</div></div>
      <div class="pair"><div class="label">Podium %</div><div class="value">${podiumPct.toFixed(1)}%</div></div>
    </div>
  `;

  document.getElementById("level-total").textContent = stats.totalRaces;
document.getElementById("level-1").textContent = stats.level1 || 0;
document.getElementById("level-2").textContent = stats.level2 || 0;
document.getElementById("level-3").textContent = stats.level3 || 0;
document.getElementById("level-4").textContent = stats.level4 || 0;
document.getElementById("level-5").textContent = stats.level5 || 0;
document.getElementById("level-6").textContent = stats.level6 || 0;

}

async function loadDriverRaceHistory(driverName) {
  try {
    const response = await fetch(raceResultsSheetURL);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
    const headers = rows[0];
    const col = (name) => headers.indexOf(name);

    const driverRaces = rows.slice(1).filter(row => row[col("DriverName")] === driverName).map(row => ({
      round: row[col("RaceNo")],
      date: row[col("Date")],
      car: row[col("Car")],
      track: row[col("Track")],
      chances: row[col("Chances")],
      position: row[col("Position")],
      points: row[col("Points")],
      level: row[col("RaceLevel")]
    }));

    driverRaces.sort((a, b) => parseInt(b.round) - parseInt(a.round));
    renderDriverRaceHistory(driverRaces);
  } catch (error) {
    console.error("Error loading race history:", error);
  }
}

function renderDriverRaceHistory(driverRaces) {
  if (!driverRaces.length) return;

  const container = document.getElementById("race-history-area");
  const table = document.createElement("table");
  table.classList.add("race-history-table");

  const thead = `
    <thead>
      <tr>
        <th>Round</th>
        <th>Position</th>
        <th>Chances</th>
        <th>Level</th>
        <th>Car</th>
        <th>Track</th>
        <th>Date</th>
      </tr>
    </thead>`;

  const tbody = driverRaces.map(race => {
    let rowClass = "";
    if (race.position === "1") rowClass = "first-place";
    else if (race.position === "2") rowClass = "second-place";
    else if (race.position === "3") rowClass = "third-place";

    return `
      <tr class="${rowClass}">
        <td>${race.round}</td>
        <td>${race.position}</td>
        <td>${race.chances}</td>
        <td>${race.level}</td>
        <td>${race.car}</td>
        <td>${race.track}</td>
        <td>${race.date}</td>
      </tr>`;
  }).join("");

  table.innerHTML = thead + `<tbody>${tbody}</tbody>`;
  // container.appendChild(document.createElement("hr"));
  container.appendChild(Object.assign(document.createElement("h2"), { textContent: "Race History" }));
  container.appendChild(table);
}
