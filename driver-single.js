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
  await loadDriverRaceHistory(driverName); // <-- Added this line
});

async function loadDriverTeams() {
  try {
    const response = await fetch(driversSheetURL);
    const data = await response.text();
    const rows = data.split("\n").slice(1);

    rows.forEach(row => {
      const cols = row.split(",");
      const driverName = cols[0]?.replace(/"/g, '').trim();
      const teamName = cols[1]?.replace(/"/g, '').trim();
      if (driverName) {
        driverTeams[driverName] = teamName || "Unknown";
      }
    });
  } catch (error) {
    console.error("Error loading driver teams:", error);
  }
}

async function loadDriverStats() {
  try {
    const response = await fetch(raceResultsSheetURL);
    const data = await response.text();
    const rows = data.split("\n").slice(1);

    rows.forEach(row => {
      const cols = row.split(",");
      const driverName = cols[2]?.replace(/"/g, '').trim();
      const raceLevelRaw = cols[5]?.trim();
      const points = parseInt(cols[8]?.trim(), 10);
      const finishPosition = parseInt(cols[6]?.trim(), 10);

      if (!driverName) return;

      if (!driverStats[driverName]) {
        driverStats[driverName] = {
          team: driverTeams[driverName] || "Unknown",
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0,
          level5: 0,
          totalRaces: 0,
          totalPoints: 0,
          firstPlace: 0,
          secondPlace: 0,
          thirdPlace: 0
        };
      }

      const stats = driverStats[driverName];
      const raceLevel = raceLevelRaw.replace(/\D/g, "");

      if (raceLevel) {
        switch (raceLevel) {
          case "1": stats.level1++; break;
          case "2": stats.level2++; break;
          case "3": stats.level3++; break;
          case "4": stats.level4++; break;
          case "5": stats.level5++; break;
        }
      }

      stats.totalRaces++;

      if (!isNaN(points)) {
        stats.totalPoints += points;
      }

      if (!isNaN(finishPosition)) {
        if (finishPosition === 1) stats.firstPlace++;
        else if (finishPosition === 2) stats.secondPlace++;
        else if (finishPosition === 3) stats.thirdPlace++;
      }
    });
  } catch (error) {
    console.error("Error loading race results:", error);
  }
}

function renderDriverDetails(driverName) {
  const stats = driverStats[driverName];
  const container = document.getElementById("driver-details-container");

  const firstPlaces = stats.firstPlace;
  const secondPlaces = stats.secondPlace;
  const thirdPlaces = stats.thirdPlace;
  const totalPodiums = firstPlaces + secondPlaces + thirdPlaces;
  const firstPlacePercentage = stats.totalRaces ? (firstPlaces / stats.totalRaces) * 100 : 0;
  const podiumPercentage = stats.totalRaces ? (totalPodiums / stats.totalRaces) * 100 : 0;
  const pointsAverage = stats.totalRaces ? (stats.totalPoints / stats.totalRaces) : 0;

  container.innerHTML = `
    <div class="driver-card">
      <div class="driver-header">
        <h2>${driverName}</h2>
        <h3 class="team-name">${stats.team}</h3>
      </div>

      <div class="driver-stats">
        <div class="stat-item"><span>L1:</span> ${stats.level1}</div>
        <div class="stat-item"><span>L2:</span> ${stats.level2}</div>
        <div class="stat-item"><span>L3:</span> ${stats.level3}</div>
        <div class="stat-item"><span>L4:</span> ${stats.level4}</div>
        <div class="stat-item"><span>L5:</span> ${stats.level5}</div>
<br>
        <div class="stat-item"><span><b>Total Races:</span> ${stats.totalRaces}</b></div>
        <div class="stat-item"><span><b>Total Points:</span> ${stats.totalPoints}</b></div>
<br>
<br>

        <div class="stat-item"><span>1st:</span> ${firstPlaces}</div>
        <div class="stat-item"><span>2nd:</span> ${secondPlaces}</div>
        <div class="stat-item"><span>3rd:</span> ${thirdPlaces}</div>
<br>

        <div class="stat-item"><span><b>Total Podiums:</span> ${totalPodiums}</b></div>
        <br>
        <br>

        <div class="stat-item"><span>1st Place %:</span> ${firstPlacePercentage.toFixed(2)}%</div>
        <div class="stat-item"><span>Podium %:</span> ${podiumPercentage.toFixed(2)}%</div>
        <div class="stat-item"><span>Points Average:</span> ${pointsAverage.toFixed(2)}</div>
      </div>
    </div>
  `;
}

// NEW FUNCTIONS BELOW

async function loadDriverRaceHistory(driverName) {
  try {
    const response = await fetch(raceResultsSheetURL);
    const data = await response.text();
    const rows = data.split("\n").slice(1); // Skip header

    const driverRaces = [];

    rows.forEach(row => {
      const cols = row.split(",");
      const name = cols[2]?.replace(/"/g, '').trim(); // Driver Name column

      if (name === driverName) {
        driverRaces.push({
          round: cols[0]?.trim(),
          date: cols[1]?.trim(),
          car: cols[3]?.trim(),
          track: cols[4]?.trim(),
          chances: cols[5]?.trim(),
          position: cols[6]?.trim(),
          points: cols[7]?.trim()
        });
      }
    });

    // Sort by Round descending
    driverRaces.sort((a, b) => parseInt(b.round) - parseInt(a.round));

    renderDriverRaceHistory(driverRaces);
  } catch (error) {
    console.error("Error loading driver race history:", error);
  }
}

function renderDriverRaceHistory(driverRaces) {
  if (!driverRaces.length) return;

  const container = document.getElementById("driver-details-container");

  const table = document.createElement("table");
  table.classList.add("race-history-table");

  const thead = `
    <thead>
      <tr>
        <th>Round</th>
        <th>Date</th>
        <th>Car</th>
        <th>Track</th>
        <th>Chances</th>
        <th>Position</th>
        <th>Points</th>
      </tr>
    </thead>
  `;

  const tbody = driverRaces.map(race => {
    let rowClass = "";
    if (race.position === "1") rowClass = "first-place";
    else if (race.position === "2") rowClass = "second-place";
    else if (race.position === "3") rowClass = "third-place";

    return `
      <tr class="${rowClass}">
        <td>${race.round}</td>
        <td>${race.date}</td>
        <td>${race.car}</td>
        <td>${race.track}</td>
        <td>${race.chances}</td>
        <td>${race.position}</td>
        <td>${race.points}</td>
      </tr>
    `;
  }).join("");

  table.innerHTML = thead + `<tbody>${tbody}</tbody>`;

  container.appendChild(document.createElement("hr"));
  const title = document.createElement("h2");
  title.innerText = "Race History";
  container.appendChild(title);
  container.appendChild(table);
}
