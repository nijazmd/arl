const currentRoundNumber = 1;

// CONFIG
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv"; // Driver sheet (CSV download)
const webAppUrl = "https://script.google.com/macros/s/AKfycby4VCqbFxi-ex0NJ9XlFKlyHqbWKbnk1lcbhB6S3UApUp5ekP6kAoIeiw3rMIvdiUg43Q/exec"; // Web App URL
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv"; // Race Results Sheet
const carsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2855635&single=true&output=csv"; 
const tracksSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2013785235&single=true&output=csv"; 

const driverTeams = {}; // Global map

// 🆕 New reusable function to populate select boxes
function populateSelect(selectId, options) {
  const selectElement = document.getElementById(selectId);
  if (!selectElement) {
    console.warn(`Select element with ID "${selectId}" not found.`);
    return;
  }
  selectElement.innerHTML = '<option value="">Select</option>'; // Start fresh
  options.forEach(optionText => {
    const option = document.createElement('option');
    option.value = optionText;
    option.textContent = optionText;
    selectElement.appendChild(option);
  });
}

// Populate Drivers
async function populateDriverDropdown() {
  try {
    const driverSelect = document.getElementById("driverName");
    if (!driverSelect) return; // Skip if driverName field is not on the page

    const response = await fetch(sheetURL);
    const data = await response.text();
    const rows = data.split("\n").slice(1); // skipping header

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

// 🆕 Populate Cars
async function populateCarDropdown() {
    try {
      const carSelect = document.getElementById("carName");
      if (!carSelect) return;
  
      const response = await fetch(carsSheetURL);
      const data = await response.text();
      const rows = data.split("\n").slice(1); 
  
      carSelect.innerHTML = '<option value="">Select Car</option>';
      rows.forEach(row => {
        const cols = row.split(",");
        const carName = cols[0]?.replace(/["\r\n]/g, '').trim(); // 🛠 fixed here
        if (carName) {
          const option = document.createElement("option");
          option.value = carName;
          option.textContent = carName;
          carSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Error loading cars:", error);
    }
  }
  
  // 🆕 Populate Tracks
  async function populateTrackDropdown() {
    try {
      const trackSelect = document.getElementById("trackName");
      if (!trackSelect) return;
  
      const response = await fetch(tracksSheetURL);
      const data = await response.text();
      const rows = data.split("\n").slice(1);
  
      trackSelect.innerHTML = '<option value="">Select Track</option>';
      rows.forEach(row => {
        const cols = row.split(",");
        const trackName = cols[0]?.replace(/["\r\n]/g, '').trim(); // 🛠 fixed here
        if (trackName) {
          const option = document.createElement("option");
          option.value = trackName;
          option.textContent = trackName;
          trackSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Error loading tracks:", error);
    }
  }
  

async function populateCurrentRound() {
  const roundInput = document.getElementById('roundNumber');
  if (roundInput) {
    roundInput.value = currentRoundNumber;
  }
}

// Setup when page is ready
document.addEventListener("DOMContentLoaded", () => {
    populateDriverDropdown();
    populateCarDropdown();
    populateTrackDropdown();
    populateCurrentRound();
  
    const currentRoundDisplay = document.getElementById('currentRoundDisplay');
    if (currentRoundDisplay) {
      currentRoundDisplay.textContent = currentRoundNumber;
    }
  
    const driverStandings = document.getElementById('driver-standings');
    if (driverStandings) {
      loadStandings();
    }
  });
  

// Open and Close Form
function openForm() {
    const popupForm = document.getElementById("popupForm");
    if (popupForm) {
      popupForm.style.display = "block";
    } else {
      console.warn('Popup form element not found.');
    }
  }
  
  function closeForm() {
    const popupForm = document.getElementById("popupForm");
    const raceForm = document.getElementById("raceForm");
  
    if (popupForm) {
      popupForm.style.display = "none";
    } else {
      console.warn('Popup form element not found.');
    }
  
    if (raceForm) {
      raceForm.reset();
    } else {
      console.warn('Race form element not found.');
    }
  }
  

// Submit Race Result
async function submitRaceResult(event) {
    event.preventDefault();
  
    const roundNumber = document.getElementById('roundNumber').value;
    const driverName = document.getElementById('driverName').value;
    const carSelect = document.getElementById('carName');
    const trackSelect = document.getElementById('trackName');
    const carName = carSelect ? carSelect.value : "";
    const trackName = trackSelect ? trackSelect.value : "";
    const raceLevel = document.querySelector('input[name="raceLevel"]:checked')?.value;
    const chances = document.querySelector('input[name="chances"]:checked')?.value;
    const position = document.querySelector('input[name="position"]:checked')?.value;
    const points = calculatePoints(position, chances);
  
    if (!driverName || !raceLevel || !chances || !position || !roundNumber) {
      alert("Please fill out all required fields.");
      return;
    }
  
    const formData = new FormData();
    formData.append('roundNumber', roundNumber);
    formData.append('driverName', driverName);
    if (carName) formData.append('carName', carName);
    if (trackName) formData.append('trackName', trackName);
    formData.append('raceLevel', raceLevel);
    formData.append('chances', chances);
    formData.append('position', position);
    formData.append('points', points);
  
    try {
      await fetch(webAppUrl, {
        method: "POST",
        body: formData,
        mode: "no-cors"
      });
  
      // After successful submit
      alert("Race Result Added Successfully!");
  
      // Clear the form manually (in case reset didn't work)
      const raceForm = document.getElementById('raceForm');
      if (raceForm) {
        raceForm.reset();
      }
  
      // Close the form popup
      closeForm();
  
    } catch (error) {
      console.error("Error submitting race:", error);
      alert("Failed to submit race result. Try again.");
    }
  }
  

// Points Calculation
function calculatePoints(position, chances) {
  const pointsTable = {
    1: { 1: 54, 2: 44, 3: 36, 4: 30, 5: 24 },
    2: { 1: 27, 2: 22, 3: 18, 4: 15, 5: 12 },
    3: { 1: 20, 2: 16, 3: 12, 4: 10, 5: 8 },
    4: { 1: 11, 2: 8, 3: 6, 4: 4, 5: 2 },
    5: { 1: 8, 2: 5, 3: 3, 4: 2, 5: 1 }
  };

  const pos = parseInt(position, 10);
  const chance = parseInt(chances, 10);

  return (pointsTable[pos] && pointsTable[pos][chance]) ? pointsTable[pos][chance] : 0;
}

// Load Race Results and Calculate Standings
async function loadStandings() {
  try {
    const response = await fetch(raceResultsSheetURL);
    const data = await response.text();
    const rows = data.split("\n").slice(1).map(row => row.split(","));

    const driverPoints = {};
    const driverRaceCount = {};

    rows.forEach(row => {
      const driver = row[2]?.replace(/"/g, '').trim();
      const points = parseInt(row[8], 10);

      if (!driver || isNaN(points)) return;

      if (!driverPoints[driver]) {
        driverPoints[driver] = 0;
        driverRaceCount[driver] = 0;
      }
      driverPoints[driver] += points;
      driverRaceCount[driver] += 1;
    });

    // Fetch Driver-Team mapping
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

    const teamPoints = {};
    const teamRaceCount = {};
    for (const [driver, points] of Object.entries(driverPoints)) {
      const team = driverTeams[driver] || "Unknown Team";
      if (!teamPoints[team]) {
        teamPoints[team] = 0;
        teamRaceCount[team] = 0;
      }
      teamPoints[team] += points;
      teamRaceCount[team] += driverRaceCount[driver] || 0;
    }

    const sortedDrivers = Object.entries(driverPoints)
      .sort((a, b) => b[1] - a[1])
      .map(([driver, points]) => ({
        driver,
        points,
        races: driverRaceCount[driver] || 0
      }));

    const sortedTeams = Object.entries(teamPoints)
      .sort((a, b) => b[1] - a[1])
      .map(([team, points]) => ({
        team,
        points,
        races: teamRaceCount[team] || 0
      }));

    renderDriverStandings(sortedDrivers);
    renderTeamStandings(sortedTeams);

  } catch (error) {
    console.error("Error loading standings:", error);
  }
}


function renderDriverStandings(standings) {
  const container = document.getElementById("driver-standings");
  container.innerHTML = `
    <table>
      <thead>
        <tr><th>R</th><th>Dr</th><th>G</th><th>Pts</th></tr>
      </thead>
      <tbody>
        ${standings.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.driver}</td>
            <td>${item.races}</td>
            <td>${item.points}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderTeamStandings(standings) {
  const container = document.getElementById("team-standings");
  container.innerHTML = `
    <table>
      <thead>
        <tr><th>R</th><th>Tm</th><th>G</th><th>Pts</th></tr>
      </thead>
      <tbody>
        ${standings.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.team}</td>
            <td>${item.races}</td>
            <td>${item.points}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

