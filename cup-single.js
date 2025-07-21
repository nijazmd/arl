const urlParams = new URLSearchParams(window.location.search);
const cupID = urlParams.get("cup");

const cupEntriesSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=645625740&single=true&output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("cup-driver-table");
  const title = document.getElementById("cup-title");

  if (!cupID) {
    title.textContent = "No Cup ID provided";
    return;
  }

  try {
    const [entryResp, raceResp] = await Promise.all([
      fetch(cupEntriesSheetURL),
      fetch(raceResultsSheetURL)
    ]);

    const [entryText, raceText] = await Promise.all([
      entryResp.text(),
      raceResp.text()
    ]);

    const entryRows = entryText.trim().split("\n").map(r => r.split(",").map(s => s.trim().replace(/^"|"$/g, '')));
    const raceRows = raceText.trim().split("\n").map(r => r.split(",").map(s => s.trim().replace(/^"|"$/g, '')));

    const entryHeaders = entryRows[0];
    const raceHeaders = raceRows[0];
    const entryCol = name => entryHeaders.indexOf(name);
    const raceCol = name => raceHeaders.indexOf(name);

    const raceMap = {};
    raceRows.slice(1).forEach(row => {
      if (row[raceCol("CupID")] === cupID) {
        const driver = row[raceCol("DriverName")];
        const pos = row[raceCol("Position")];
        raceMap[driver] = pos;
      }
    });

    const cupEntries = entryRows.slice(1)
      .filter(row => row[entryCol("CupID")] === cupID)
      .sort((a, b) => parseInt(a[entryCol("Position")]) - parseInt(b[entryCol("Position")]));

    title.textContent = `${cupID} - Driver List`;

    const rowsHTML = cupEntries.map(row => {
      const driver = row[entryCol("DriverName")];
      return `
        <tr>
          <td>${row[entryCol("Position")]}</td>
          <td>${driver}</td>
          <td>${row[entryCol("Team")]}</td>
          <td>${row[entryCol("Car")]}</td>
          <td>${row[entryCol("Tyre")]}</td>
          <td>${row[entryCol("PP")]}</td>
          <td>${row[entryCol("Track")]}</td>
          <td>${raceMap[driver] || "–"}</td>
        </tr>
      `;
    }).join("");

    tableBody.innerHTML = rowsHTML;
  } catch (err) {
    console.error("Failed to load Cup data:", err);
    title.textContent = "⚠️ Failed to load Cup data";
  }
});
