const cupsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=1665101756&single=true&output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

document.addEventListener("DOMContentLoaded", async () => {
  const cupListContainer = document.getElementById("cup-list");

  try {
    const [cupsResponse, raceResponse] = await Promise.all([
      fetch(cupsSheetURL),
      fetch(raceResultsSheetURL)
    ]);

    const [cupsText, raceText] = await Promise.all([
      cupsResponse.text(),
      raceResponse.text()
    ]);

    const cupRows = cupsText.trim().split("\n").map(r => r.split(",").map(s => s.trim().replace(/^"|"$/g, '')));
    const raceRows = raceText.trim().split("\n").map(r => r.split(",").map(s => s.trim().replace(/^"|"$/g, '')));

    const cupHeaders = cupRows[0];
    const raceHeaders = raceRows[0];

    const cupCol = name => cupHeaders.indexOf(name);
    const raceCol = name => raceHeaders.indexOf(name);

    const cupData = cupRows.slice(1).map(row => ({
      CupID: row[cupCol("CupID")],
      CupName: row[cupCol("CupName")],
      MinPP: row[cupCol("MinPP")],
      MaxPP: row[cupCol("MaxPP")],
      AvgDistance: row[cupCol("AvgDistance")]
    }));

    const raceCounts = {};
    raceRows.slice(1).forEach(row => {
      const cupID = row[raceCol("CupID")];
      if (!cupID) return;
      if (!raceCounts[cupID]) raceCounts[cupID] = 0;
      raceCounts[cupID]++;
    });

    const cardsHTML = cupData.map(cup => {
      const totalRaces = raceCounts[cup.CupID] || 0;
      return `
        <div class="cup-card" onclick="location.href='cup-single.html?cup=${encodeURIComponent(cup.CupID)}'">
          <h3>${cup.CupName || "Unnamed Cup"}</h3>
          <p>🛞 Races Done: <strong>${totalRaces}/20</strong></p>
          <p>⚙️ Min PP: ${cup.MinPP || "—"} | Max PP: ${cup.MaxPP || "—"}</p>
          <p>📏 Avg Distance: ${cup.AvgDistance || "—"} km</p>
        </div>
      `;
    }).join("");

    cupListContainer.innerHTML = cardsHTML;
  } catch (err) {
    console.error("Error loading Cups:", err);
    cupListContainer.innerHTML = "<p>⚠️ Failed to load cup data.</p>";
  }
});
