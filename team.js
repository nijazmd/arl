const driversSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

const teamList = ["AMC", "BIS", "BOS", "CAR", "FRE", "HST", "GRE", "OTT", "PNX", "ZDG"];
let driverTeamMap = {};
let driverStats = {};
let teamStandings = [];
let selectedTeam = null;

document.addEventListener("DOMContentLoaded", async () => {
  selectedTeam = getTeamFromURL() || teamList[0];
  renderTeamRadios();
  await loadData();
  renderTeamSummary(selectedTeam);
  renderDriversForTeam(selectedTeam);
});

function getTeamFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("team");
}

function renderTeamRadios() {
  const container = document.getElementById("team-radio-container");
  container.innerHTML = teamList.map(team => `
    <label>
      <input type="radio" name="team" value="${team}" ${team === selectedTeam ? "checked" : ""}>
      ${team}
    </label>
  `).join("");

  document.querySelectorAll('input[name="team"]').forEach(radio => {
    radio.addEventListener("change", e => {
      const newTeam = e.target.value;
      window.location.href = `team.html?team=${newTeam}`;
    });
  });
}

async function loadData() {
  const [driversCSV, resultsCSV] = await Promise.all([
    fetch(driversSheetURL).then(r => r.text()),
    fetch(raceResultsSheetURL).then(r => r.text())
  ]);

  const driverLines = driversCSV.split("\n").slice(1);
  driverLines.forEach(row => {
    const [name, team] = row.split(",").map(s => s.replace(/"/g, "").trim());
    if (name && team) {
      driverTeamMap[name] = team;
    }
  });

    // --- parse RESULTS by header name (robust) ---
    const resultRows = resultsCSV
    .trim()
    .split("\n")
    .map(r => r.split(",").map(s => s.replace(/"/g, "").trim()));

  const rHeaders = resultRows[0];
  const rCol = name => rHeaders.indexOf(name);
  const resultLines = resultRows.slice(1);

  const teamPointsMap = {};
  const driverRaceStats = {};

  resultLines.forEach(cols => {
    const driver = cols[rCol("DriverName")];
    const team = cols[rCol("Team")];
    const position = parseInt(cols[rCol("Position")] || "", 10);
    const levelNum = parseInt((cols[rCol("RaceLevel")] || "").replace(/[^\d]/g, ""), 10);
    if (!(levelNum >= 1 && levelNum <= 6)) return; // only L1–L6

    const pts = parseInt(cols[rCol("Points")] || "", 10) || 0;
    const disc = parseInt(cols[rCol("DisciplinaryPoints")] || "", 10) || 0;
    const totalPoints = pts + disc;
    if (!driver) return;

    // Team totals
    teamPointsMap[team] = (teamPointsMap[team] || 0) + totalPoints;

    // Driver stats
    if (!driverRaceStats[driver]) {
      driverRaceStats[driver] = { totalPoints: 0, races: 0, firsts: 0, podiums: 0, disciplinary: 0 };
    }
    const s = driverRaceStats[driver];
    s.totalPoints += totalPoints;
    s.disciplinary += disc;
    s.races += 1;
    if (position === 1) s.firsts += 1;
    if (position >= 1 && position <= 3) s.podiums += 1;
  });

  teamStandings = Object.entries(teamPointsMap)
    .sort((a, b) => b[1] - a[1])
    .map(([team, points], i) => ({ team, points, rank: i + 1 }));

  // build driverStats with numeric avgPoints
  driverStats = Object.entries(driverRaceStats).map(([driver, data]) => {
    const team = driverTeamMap[driver] || "Unknown";
    const avg = data.races ? data.totalPoints / data.races : 0;
    return {
      driver,
      team,
      ...data,
      avgPoints: Number(avg.toFixed(2)),
      firstPct: Number(((data.firsts / (data.races || 1)) * 100).toFixed(1)),
      podiumPct: Number(((data.podiums / (data.races || 1)) * 100).toFixed(1)),
      discAvg: Number(((data.races ? data.disciplinary / data.races : 0)).toFixed(2))
    };
  });

  // Rank drivers by average points (desc), then total points, then wins as tiebreakers
  driverStats
    .sort((a, b) =>
      (b.avgPoints - a.avgPoints) ||
      (b.totalPoints - a.totalPoints) ||
      (b.firsts - a.firsts)
    )
    .forEach((d, i) => d.rank = i + 1);

}

function renderTeamSummary(teamCode) {
  const teamInfo = teamStandings.find(t => t.team === teamCode);
  const heading = document.getElementById("team-name-heading");
  const rankDiv = document.getElementById("team-rank");
  const pointsDiv = document.getElementById("team-points");

  heading.textContent = teamCode;

  if (teamInfo) {
    rankDiv.textContent = `#${teamInfo.rank}`;
    pointsDiv.textContent = `Total Points: ${teamInfo.points}`;
  } else {
    rankDiv.textContent = "Not ranked";
    pointsDiv.textContent = "";
  }
}

function renderDriversForTeam(teamCode) {
  const container = document.getElementById("driver-cards");
  const filtered = driverStats.filter(d => d.team === teamCode);

  container.innerHTML = filtered.map(driver => `
    <div class="driver-card">
    <div class="driver-name"><a href="driver-single.html?driver=${encodeURIComponent(driver.driver)}">${driver.driver}</a></div>
      <div class="driver-row">
        <div class="label">Rank</div>
        <div class="value dominant">${driver.rank}</div>
      </div>
      <div class="driver-pair">
        <div class="pair"><div class="label">Races</div><div class="value">${driver.races}</div></div>
        <div class="pair"><div class="label">1st Place</div><div class="value">${driver.firsts}</div></div>
        <div class="pair"><div class="label">Podiums</div><div class="value">${driver.podiums}</div></div>
        <div class="pair"><div class="label">Points</div><div class="value">${driver.totalPoints}</div></div>
        <div class="pair"><div class="label">Disciplinary Avg</div><div class="value">${driver.discAvg}</div></div>
        <div class="pair"><div class="label">1st %</div><div class="value">${driver.firstPct}%</div></div>
        <div class="pair"><div class="label">Avg Points</div><div class="value">${driver.avgPoints}</div></div>
        <div class="pair"><div class="label">Podium %</div><div class="value">${driver.podiumPct}%</div></div>
      </div>
    </div>
  `).join("");
}
