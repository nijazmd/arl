const webAppUrl = "https://script.google.com/macros/s/AKfycbwLxrhusbzSJWL3kuHtG0x_gdjyjzFF8RBu3HipatIlpgy_Sa2HwUu-EuFbG6m5J1Lc7A/exec";

const currentRoundNumber = 2;

const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

const columnIndexMap = {
    RaceNo: 0,
    Date: 1,
    DriverName: 2,
    Team: 3,
    Car: 4,
    Track: 5,
    Circuit: 6,
    Direction: 7,
    RaceLevel: 8,
    Chances: 9,
    Position: 10,
    Points: 11,
    DisciplinaryPoints: 12
};

const driverTeams = {};

function adjustDisciplinary(amount) {
  const input = document.getElementById("disciplinaryPoints");
  if (!input) return;
  let current = parseInt(input.value || "0", 10);

  const newValue = current + amount;
  if (newValue >= -5 && newValue <= 5) {
    input.value = newValue;
  }
}

function populateSelect(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">Select</option>';
  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
}

async function populateDriverDropdown() {
  try {
    const response = await fetch(sheetURL);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, "").trim()));
    const headers = rows[0];
    const col = name => headers.indexOf(name);

    const driverNames = rows.slice(1).map(row => {
      const driver = row[col("Driver")];
      const team = row[col("Team")];
      if (driver && team) {
        driverTeams[driver] = team; // 🔥 populate map
      }
      return driver;
    }).filter(Boolean);

    populateSelect("driverName", driverNames);
  } catch (err) {
    console.error("Failed to populate drivers:", err);
  }
}


async function populateCarDropdown() {
  try {
    const carSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2855635&single=true&output=csv";
    const response = await fetch(carSheetUrl);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, "").trim()));
    const headers = rows[0];
    const col = name => headers.indexOf(name);

    const carNames = rows.slice(1)
      .map(row => row[col("CarName")])
      .filter(Boolean);

    populateSelect("carName", carNames);
  } catch (err) {
    console.error("Failed to populate cars:", err);
  }
}



const trackToCircuits = {};

async function populateTrackDropdown() {
  try {
    const tracksSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2013785235&single=true&output=csv";
    const response = await fetch(tracksSheetUrl);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, "").trim()));
    const headers = rows[0];
    const col = name => headers.indexOf(name);

    rows.slice(1).forEach(row => {
      const track = row[col("TrackName")];
      const circuit = row[col("Circuit")];
      if (!track) return;
      if (!trackToCircuits[track]) trackToCircuits[track] = [];
      if (circuit && !trackToCircuits[track].includes(circuit)) {
        trackToCircuits[track].push(circuit);
      }
    });

    populateSelect("trackName", Object.keys(trackToCircuits));
    document.getElementById("trackName")?.addEventListener("change", updateCircuitDropdown);
  } catch (err) {
    console.error("Failed to populate tracks:", err);
  }
}

function updateCircuitDropdown() {
  const track = document.getElementById("trackName")?.value || "";
  const circuits = trackToCircuits[track] || [];
  populateSelect("circuitName", circuits);

  // Automatically select the first circuit if available
  const circuitSelect = document.getElementById("circuitName");
  if (circuits.length > 0) {
    circuitSelect.selectedIndex = 1; // index 0 is "Select", 1 is first real option
  }
}


async function loadStandings() {
  try {
    const response = await fetch(raceResultsSheetURL);
    const data = await response.text();
    const rows = data.split("\n").slice(1).map(row => row.split(","));

    const driverPoints = {};
    const driverRaceCount = {};
    const driverFirsts = {};
    const driverPodiums = {};

    rows.forEach(row => {
      const driver = row[columnIndexMap.DriverName]?.replace(/"/g, '').trim();
      const racePoints = parseInt(row[columnIndexMap.Points], 10);
      const disciplinaryPoints = parseInt(row[columnIndexMap.DisciplinaryPoints], 10) || 0;
      const position = parseInt(row[columnIndexMap.Position], 10);
      const totalPoints = isNaN(racePoints) ? 0 : racePoints + disciplinaryPoints;

      if (!driver || isNaN(totalPoints)) return;

      if (!driverPoints[driver]) {
        driverPoints[driver] = 0;
        driverRaceCount[driver] = 0;
        driverFirsts[driver] = 0;
        driverPodiums[driver] = 0;
      }

      driverPoints[driver] += totalPoints;
      driverRaceCount[driver] += 1;

      if (position === 1) driverFirsts[driver]++;
      if (position >= 1 && position <= 3) driverPodiums[driver]++;
    });

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
    const teamFirsts = {};
    const teamPodiums = {};

    for (const [driver, points] of Object.entries(driverPoints)) {
      const team = driverTeams[driver] || "Unknown Team";
      if (!teamPoints[team]) {
        teamPoints[team] = 0;
        teamRaceCount[team] = 0;
        teamFirsts[team] = 0;
        teamPodiums[team] = 0;
      }
      teamPoints[team] += points;
      teamRaceCount[team] += driverRaceCount[driver] || 0;
      teamFirsts[team] += driverFirsts[driver] || 0;
      teamPodiums[team] += driverPodiums[driver] || 0;
    }

    const sortedDrivers = Object.entries(driverPoints)
      .sort((a, b) => b[1] - a[1])
      .map(([driver, points]) => ({
        driver,
        points,
        races: driverRaceCount[driver] || 0,
        firsts: driverFirsts[driver] || 0,
        podiums: driverPodiums[driver] || 0
      }));

    const sortedTeams = Object.entries(teamPoints)
      .sort((a, b) => b[1] - a[1])
      .map(([team, points]) => ({
        team,
        points,
        races: teamRaceCount[team] || 0,
        firsts: teamFirsts[team] || 0,
        podiums: teamPodiums[team] || 0
      }));

    renderDriverStandings(sortedDrivers);
    renderTeamStandings(sortedTeams);

  } catch (error) {
    console.error("Error loading standings:", error);
  }
}

// ...[existing constants and functions unchanged]...

function renderDriverStandings(standings) {
  standings = standings.map(item => ({
    ...item,
    ptsAvg: item.races ? (item.points / item.races) : 0
  })).sort((a, b) => b.ptsAvg - a.ptsAvg);

  const container = document.getElementById("driver-standings");
  container.innerHTML = `
    <table>
      <thead>
        <tr><th>R</th><th>Dr</th><th>T</th><th>G</th><th>🏆</th><th>Pod</th><th>Pts</th><th>Pts Avg</th></tr>
      </thead>
      <tbody>
        ${standings.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><a href="driver-single.html?driver=${encodeURIComponent(item.driver)}">${item.driver}</a></td>
            <td><a href="team.html?team=${encodeURIComponent(driverTeams[item.driver] || "Unknown")}">${driverTeams[item.driver] || "—"}</a></td>
            <td>${item.races}</td>
            <td>${item.firsts}</td>
            <td>${item.podiums}</td>
            <td>${item.points}</td>
            <td>${item.ptsAvg.toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderTeamStandings(standings) {
  standings = standings.map(item => ({
    ...item,
    ptsAvg: item.races ? (item.points / item.races) : 0
  })).sort((a, b) => b.ptsAvg - a.ptsAvg);

  const container = document.getElementById("team-standings");
  container.innerHTML = `
    <table>
      <thead>
        <tr><th>R</th><th>Tm</th><th>G</th><th>🏆</th><th>Pod</th><th>Pts</th><th>Pts Avg</th></tr>
      </thead>
      <tbody>
        ${standings.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><a href="team.html?team=${encodeURIComponent(item.team)}">${item.team}</a></td>
            <td>${item.races}</td>
            <td>${item.firsts}</td>
            <td>${item.podiums}</td>
            <td>${item.points}</td>
            <td>${item.ptsAvg.toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}


document.addEventListener("DOMContentLoaded", () => {
  const currentRoundDisplay = document.getElementById("currentRoundDisplay");
  if (currentRoundDisplay) {
    currentRoundDisplay.textContent = currentRoundNumber;
  }

  if (document.getElementById("driver-standings") && document.getElementById("team-standings")) {
    loadStandings();
  }

  if (document.getElementById("raceForm")) {
    populateDriverDropdown();
    populateCarDropdown();
    populateTrackDropdown();
  }
});

async function submitRaceResult(event) {
  event.preventDefault();

  const form = document.getElementById("raceForm");
  const formData = new FormData(form);

  const driverName = formData.get("driverName");
  const carName = formData.get("carName");
  const trackName = formData.get("trackName");
  const circuitName = formData.get("circuitName");
  const direction = formData.get("direction");
  const raceLevel = formData.get("raceLevel");
  const chances = formData.get("chances");
  const position = formData.get("position");
  const disciplinaryPoints = formData.get("disciplinaryPoints");

  if (!driverName || !carName || !trackName || !circuitName || !direction || !raceLevel || !chances || !position) {
    alert("Please fill in all required fields.");
    return;
  }




  const points = calculatePoints(position, chances);
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

  formData.append("points", points);

  const teamName = driverTeams[driverName] || "Unknown";
  formData.append("team", teamName);

  try {
    await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      body: formData
    });

    alert("Race result submitted!");
    form.reset();
  } catch (err) {
    console.error("Submission failed:", err);
    alert("There was an error submitting the form.");
  }
}
