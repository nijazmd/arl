
const currentRoundNumber = 1;

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

async function loadStandings() {
    try {
        const response = await fetch(raceResultsSheetURL);
        const data = await response.text();
        const rows = data.split("\n").slice(1).map(row => row.split(","));

        const driverPoints = {};
        const driverRaceCount = {};

        rows.forEach(row => {
            const driver = row[columnIndexMap.DriverName]?.replace(/"/g, '').trim();
            const racePoints = parseInt(row[columnIndexMap.Points], 10);
            const disciplinaryPoints = parseInt(row[columnIndexMap.DisciplinaryPoints], 10) || 0;
            const totalPoints = isNaN(racePoints) ? 0 : racePoints + disciplinaryPoints;

            if (!driver || isNaN(totalPoints)) return;

            if (!driverPoints[driver]) {
                driverPoints[driver] = 0;
                driverRaceCount[driver] = 0;
            }

            driverPoints[driver] += totalPoints;
            driverRaceCount[driver] += 1;
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
                <tr><th>R</th><th>Dr</th><th>T</th><th>G</th><th>Pts</th></tr>
            </thead>
            <tbody>
                ${standings.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td><a href="driver-single.html?driver=${encodeURIComponent(item.driver)}">${item.driver}</a></td>
                        <td><a href="team.html?team=${encodeURIComponent(driverTeams[item.driver] || "Unknown")}">${driverTeams[item.driver] || "—"}</a></td>
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
                        <td><a href="team.html?team=${encodeURIComponent(item.team)}">${item.team}</a></td>
                        <td>${item.races}</td>
                        <td>${item.points}</td>
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

  // ✅ Call loadStandings if we're on a page that needs it
  if (document.getElementById("driver-standings") && document.getElementById("team-standings")) {
    loadStandings();
  }
});
