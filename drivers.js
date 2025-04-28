const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";
const driversSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv"; // Driver-Team sheet

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
    const data = await response.text();
    const rows = data.split("\n").slice(1); // skip header

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

// Load race results and calculate stats
async function loadDriverStats() {
    try {
      const response = await fetch(raceResultsSheetURL);
      const data = await response.text();
      const rows = data.split("\n").slice(1); // skip header
  
      rows.forEach(row => {
        const cols = row.split(",");
        const driverName = cols[2]?.replace(/"/g, '').trim();
        const raceLevelRaw = cols[5]?.trim();
        const points = parseInt(cols[8]?.trim(), 10);
  
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
            totalPoints: 0
          };
        }
  
        const stats = driverStats[driverName];
  
        const raceLevel = raceLevelRaw.replace(/\D/g, ""); // Remove non-digits (safety)
  
        if (raceLevel) {
          switch (raceLevel) {
            case "1": stats.level1++; break;
            case "2": stats.level2++; break;
            case "3": stats.level3++; break;
            case "4": stats.level4++; break;
            case "5": stats.level5++; break;
          }
        }
  
        // Count every race regardless of level
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
        return a[1].totalRaces - b[1].totalRaces; // Sort by total races (ascending)
      }
      return a[1].totalPoints - b[1].totalPoints; // If same races, sort by points (ascending)
    });

  sortedDrivers.forEach(([driver, stats]) => {
    const encodedDriver = encodeURIComponent(driver);
    const driverLink = `<a href="driver-single.html?driver=${encodedDriver}">${driver}</a>`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${driverLink}</td>
      <td>${stats.team}</td>
      <td>${stats.level1}</td>
      <td>${stats.level2}</td>
      <td>${stats.level3}</td>
      <td>${stats.level4}</td>
      <td>${stats.level5}</td>
      <td>${stats.totalRaces}</td>
      <td>${stats.totalPoints}</td>
    `;
    tbody.appendChild(row);
  });
}
