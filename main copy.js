// CONFIG
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv"; // Driver sheet (CSV download)
const webAppUrl = "https://script.google.com/macros/s/AKfycbwKrmawcfmLnDpRp6rg5OB62pFB1NiBwjP4JGNp1hE7VN560hrNUffM15Iab_B02jzsng/exec"; // Web App URL

// Populate Drivers
document.addEventListener('DOMContentLoaded', populateDriverDropdown);

async function populateDriverDropdown() {
    try {
      const response = await fetch(sheetURL);
      const data = await response.text();
      const rows = data.split("\n").slice(1); // skipping header
      const driverSelect = document.getElementById("driverName");
  
      driverSelect.innerHTML = '<option value="">Select Driver</option>'; // reset
      rows.forEach(row => {
        const cols = row.split(",");
        const driverName = cols[0].replace(/"/g, ''); // clean up
        if (driverName.trim() !== "") {
          const option = document.createElement("option");
          option.value = driverName;
          option.textContent = driverName;
          driverSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Error loading drivers:", error);
    }
  }
  
  async function populateCurrentRound() {
    try {
      const response = await fetch(sheetURL);
      const data = await response.text();
      const rows = data.split("\n").slice(1); // Skip header
      const numEntries = rows.length;
      const currentRound = Math.floor(numEntries / 20) + 1;
  
      document.getElementById('roundNumber').value = currentRound;
    } catch (error) {
      console.error("Error fetching current round:", error);
    }
  }

  
  document.addEventListener("DOMContentLoaded", () => {
    populateDriverDropdown();
    populateCurrentRound();
    loadStandings(); // ← Add this here
  });
  

  
// Open and Close Form
function openForm() {
  document.getElementById("popupForm").style.display = "block";
}

function closeForm() {
  document.getElementById("popupForm").style.display = "none";
  document.getElementById("raceForm").reset();
}

// Submit Race Result
async function submitRaceResult(event) {
    event.preventDefault();
    
    const roundNumber = document.getElementById('roundNumber').value;
    const driverName = document.getElementById('driverName').value;
    const raceLevel = document.querySelector('input[name="raceLevel"]:checked')?.value;
    const chances = document.querySelector('input[name="chances"]:checked')?.value;
    const position = document.querySelector('input[name="position"]:checked')?.value;
    const points = calculatePoints(position, chances);
  
    if (!driverName || !raceLevel || !chances || !position || !roundNumber) {
      alert("Please fill out all fields.");
      return;
    }
  
    const formData = new FormData();
    formData.append('roundNumber', roundNumber);
    formData.append('driverName', driverName);
    formData.append('raceLevel', raceLevel);
    formData.append('chances', chances);
    formData.append('position', position);
    formData.append('points', points);
  
    try {
      const response = await fetch(webAppUrl, {
        method: "POST",
        body: formData,
        mode: "no-cors" // Needed for Google Apps Script
      });
  
      alert("Race Result Added Successfully!");
      closeForm();
    } catch (error) {
      console.error("Error submitting race:", error);
      alert("Failed to submit race result. Try again.");
    }
  }
  

// Points Calculation
function calculatePoints(position, chances) {
    const pointsTable = {
      1: { 1: 54, 2: 44, 3: 36, 4: 30, 5: 24 }, // Position 1
      2: { 1: 27, 2: 22, 3: 18, 4: 15, 5: 12 }, // Position 2
      3: { 1: 20, 2: 16, 3: 12, 4: 10, 5: 8 },  // Position 3
      4: { 1: 11, 2: 8, 3: 6, 4: 4, 5: 2 },     // Position 4
      5: { 1: 8, 2: 5, 3: 3, 4: 2, 5: 1 }       // Position 5
    };
  
    const pos = parseInt(position, 10);
    const chance = parseInt(chances, 10);
  
    return (pointsTable[pos] && pointsTable[pos][chance]) ? pointsTable[pos][chance] : 0;
  }
  
// NEW: Load Race Results and Calculate Standings
async function loadStandings() {
    try {
      const response = await fetch(raceResultsSheetURL); // <-- We'll define this below
      const data = await response.text();
      const rows = data.split("\n").slice(1).map(row => row.split(",")); // Skip header
  
      const driverPoints = {};
      const driverTeams = {};
  
      rows.forEach(row => {
        const driver = row[2]?.replace(/"/g, '').trim(); // Driver Name
        const points = parseInt(row[6], 10); // Points
        const round = row[7]?.replace(/"/g, '').trim(); // Round Number (optional)
        
        if (!driver || isNaN(points)) return;
  
        if (!driverPoints[driver]) driverPoints[driver] = 0;
        driverPoints[driver] += points;
      });
  
      // Now fetch Driver-Team mapping from Drivers sheet
      const driverResponse = await fetch(sheetURL);
      const driverData = await driverResponse.text();
      const driverRows = driverData.split("\n").slice(1);
      driverRows.forEach(row => {
        const cols = row.split(",");
        const driverName = cols[0]?.replace(/"/g, '').trim();
        const teamName = cols[1]?.replace(/"/g, '').trim();
        if (driverName && teamName) {
          driverTeams[driverName] = teamName;
        }
      });
  
      // Team points = sum of their drivers
      const teamPoints = {};
      for (const [driver, points] of Object.entries(driverPoints)) {
        const team = driverTeams[driver] || "Unknown Team";
        if (!teamPoints[team]) teamPoints[team] = 0;
        teamPoints[team] += points;
      }
  
      // Sort drivers and teams
      const sortedDrivers = Object.entries(driverPoints).sort((a, b) => b[1] - a[1]);
      const sortedTeams = Object.entries(teamPoints).sort((a, b) => b[1] - a[1]);
  
      renderDriverStandings(sortedDrivers);
      renderTeamStandings(sortedTeams);
  
    } catch (error) {
      console.error("Error loading standings:", error);
    }
  }
  
  // Render Driver Standings Table
  function renderDriverStandings(sortedDrivers) {
    const container = document.getElementById("driver-standings");
    let html = "<table><tr><th>Rank</th><th>Driver</th><th>Points</th></tr>";
  
    sortedDrivers.forEach(([driver, points], index) => {
      html += `<tr>
        <td>${index + 1}</td>
        <td>${driver}</td>
        <td>${points}</td>
      </tr>`;
    });
  
    html += "</table>";
    container.innerHTML = html;
  }
  
  // Render Team Standings Table
  function renderTeamStandings(sortedTeams) {
    const container = document.getElementById("team-standings");
    let html = "<table><tr><th>Rank</th><th>Team</th><th>Points</th></tr>";
  
    sortedTeams.forEach(([team, points], index) => {
      html += `<tr>
        <td>${index + 1}</td>
        <td>${team}</td>
        <td>${points}</td>
      </tr>`;
    });
  
    html += "</table>";
    container.innerHTML = html;
  }
  
  // NEW: Define Race Results Sheet URL
  const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv"; // <-- SET this correctly
  