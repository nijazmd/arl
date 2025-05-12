const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";
const driversSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv";

const driverStats = {}; // Will hold statistics for each driver
const driverTeams = {}; // Map driver -> team

document.addEventListener("DOMContentLoaded", async () => {
  await loadDriverTeams();
  await loadDriverStats();
  renderDriverTable();
});

// Load driver-team relationships
async function loadDriverTeams() {
  try {
    const response = await fetch(driversSheetURL);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
    const headers = rows[0];
    const col = name => headers.indexOf(name);

    rows.slice(1).forEach(row => {
      const driverName = row[col("PlayerName")] || "";
      const teamName = row[col("Team")] || "Unknown";
      if (driverName) driverTeams[driverName] = teamName;
    });
  } catch (error) {
    console.error("Error loading driver teams:", error);
  }
}

// Load race results and calculate stats
async function loadDriverStats() {
  try {
    const response = await fetch(raceResultsSheetURL);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
    const headers = rows[0];
    const col = name => headers.indexOf(name);

    rows.slice(1).forEach(row => {
      const driverName = row[col("DriverName")];
      const raceLevelRaw = row[col("RaceLevel")] || "";
      const points = parseInt(row[col("Points")], 10);

      if (!driverName) return;

      if (!driverStats[driverName]) {
        driverStats[driverName] = {
          team: driverTeams[driverName] || "Unknown",
          totalRaces: 0,
          totalPoints: 0,
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0,
          level5: 0
        };
      }

      const stats = driverStats[driverName];
      const raceLevel = raceLevelRaw.replace(/\D/g, "");

      if (raceLevel) {
        stats[`level${raceLevel}`] = (stats[`level${raceLevel}`] || 0) + 1;
      }

      stats.totalRaces++;

      if (!isNaN(points)) {
        stats.totalPoints += points;
      }
    });
  } catch (error) {
    console.error("Error loading race results:", error);
  }
}

// Render the drivers table
function renderDriverTable() {
  const tbody = document.querySelector("#driversTable tbody");
  tbody.innerHTML = "";

  const sortedDrivers = Object.entries(driverStats)
    .sort((a, b) => {
      if (a[1].totalRaces !== b[1].totalRaces) {
        return a[1].totalRaces - b[1].totalRaces;
      }
      return a[1].totalPoints - b[1].totalPoints;
    });

  sortedDrivers.forEach(([driver, stats]) => {
    const encodedDriver = encodeURIComponent(driver);
    const driverLink = `<a href="driver-single.html?driver=${encodedDriver}">${driver}</a>`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${driverLink}</td>
      <td>${stats.team}</td>
      <td>${stats.totalPoints}</td>
      <td>${stats.totalRaces}</td>
      <td>${stats.level1}</td>
      <td>${stats.level2}</td>
      <td>${stats.level3}</td>
      <td>${stats.level4}</td>
      <td>${stats.level5}</td>
    `;
    tbody.appendChild(row);
  });
}
