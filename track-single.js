// track-single.js
const trackParam = new URLSearchParams(window.location.search).get("track");
const tracksSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2013785235&single=true&output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";
const driversSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=1967915476&single=true&output=csv";

const webAppUrl = "https://script.google.com/macros/s/AKfycbwLxrhusbzSJWL3kuHtG0x_gdjyjzFF8RBu3HipatIlpgy_Sa2HwUu-EuFbG6m5J1Lc7A/exec";

document.addEventListener("DOMContentLoaded", async () => {
  if (!trackParam) return;
  document.body.style.padding = "1rem 1rem 5rem";
  document.getElementById("track-name-heading").textContent = decodeURIComponent(trackParam);

  const [tracksText, raceText, driversText] = await Promise.all([
    fetch(tracksSheetURL).then(r => r.text()),
    fetch(raceResultsSheetURL).then(r => r.text()),
    fetch(driversSheetURL).then(r => r.text())
  ]);

  const tracks = tracksText.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
  const races = raceText.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));
  const drivers = driversText.split("\n").map(r => r.split(",").map(c => c.replace(/"/g, '').trim()));

  const tHead = tracks[0], tRows = tracks.slice(1);
  const rHead = races[0], rRows = races.slice(1);
  const dHead = drivers[0], dRows = drivers.slice(1);
  const tCol = name => tHead.indexOf(name);
  const rCol = name => rHead.indexOf(name);
  const dCol = name => dHead.indexOf(name);

  const driverToTeam = {};
  dRows.forEach(r => {
    driverToTeam[r[dCol("Driver")]] = r[dCol("Team")];
  });

  const circuits = tRows.filter(r => r[tCol("TrackName")] === trackParam);
  const circuitHTML = [];
  let maxDistance = 0, ratings = [], totalRaces = 0, firsts = 0, podiums = 0, positionSum = 0;

  circuits.forEach(c => {
    const name = c[tCol("Circuit")];
    const distance = parseFloat(c[tCol("Distance")]);
    const rating = parseFloat(c[tCol("TrackRating")]) || "—";
    if (!isNaN(distance)) maxDistance = Math.max(maxDistance, distance);
    if (!isNaN(rating)) ratings.push(rating);
    circuitHTML.push(`
      <div class="info-card single-row">
        <div class="label">${name}</div>
        <div><span class="label">Distance:</span> ${distance || "—"} km</div>
        <div><span class="label">Rating:</span> <span id="rating-${name}">${rating}</span> <a href="#" class="rate-link" data-circuit="${name}">rate</a></div>
      </div>
    `);
  });

  const avgRating = ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) : "—";
  document.getElementById("track-info").innerHTML = `
    <div class="info-card">
      <div class="pair"><span class="label">Country:</span> <span class="value">${circuits[0][tCol("Country")]}</span></div>
      <div class="pair"><span class="label">Distance:</span> <span class="value">${maxDistance} km</span></div>
      <div class="pair"><span class="label">Avg. Rating:</span> <span class="value">${avgRating}</span></div>
    </div>
  `;

  const byCircuitStats = {};

  const recent = rRows.filter(r => r[rCol("Track")] === trackParam);
  recent.sort((a, b) => new Date(b[rCol("Date")]) - new Date(a[rCol("Date")]));

  recent.forEach(r => {
    const circuit = r[rCol("Circuit")];
    const pos = parseInt(r[rCol("Position")], 10);
    if (!byCircuitStats[circuit]) byCircuitStats[circuit] = { races: 0, firsts: 0, podiums: 0, posSum: 0, valid: 0 };
    const c = byCircuitStats[circuit];
    c.races++;
    totalRaces++;
    if (pos === 1) { c.firsts++; firsts++; }
    if ([1, 2, 3].includes(pos)) { c.podiums++; podiums++; }
    if (!isNaN(pos)) { c.posSum += pos; c.valid++; positionSum += pos; }
  });

  const avgPos = totalRaces ? (positionSum / totalRaces).toFixed(2) : "—";
  const firstPct = totalRaces ? ((firsts / totalRaces) * 100).toFixed(1) : "0.0";
  const podiumPct = totalRaces ? ((podiums / totalRaces) * 100).toFixed(1) : "0.0";

  document.getElementById("track-stats").innerHTML = `
    <h3>Race Stats</h3>
    <div class="info-card">
      <div class="stat-pairs">
        <div class="pair"><div class="label">Total Races</div><div class="value">${totalRaces}</div></div>
        <div class="pair"><div class="label">1st Places</div><div class="value">${firsts}</div></div>
        <div class="pair"><div class="label">Podiums</div><div class="value">${podiums}</div></div>
        <div class="pair"><div class="label">Avg. Position</div><div class="value">${avgPos}</div></div>
        <div class="pair"><div class="label">1st Place %</div><div class="value">${firstPct}%</div></div>
        <div class="pair"><div class="label">Podium %</div><div class="value">${podiumPct}%</div></div>
      </div>
    </div>
  `;

  const byCircuitHTML = Object.entries(byCircuitStats).map(([name, s]) => {
    const avg = s.valid ? (s.posSum / s.valid).toFixed(2) : "—";
    const fPct = s.races ? ((s.firsts / s.races) * 100).toFixed(1) : "0.0";
    const pPct = s.races ? ((s.podiums / s.races) * 100).toFixed(1) : "0.0";
    return `<div class="info-card stat-pairs">
      <div class="pair"><span class="label">Circuit:</span> <span class="value">${name}</span></div>
      <div class="pair"><span class="label">Total:</span> <span class="value">${s.races}</span></div>
      <div class="pair"><span class="label">1st Places:</span> <span class="value">${s.firsts}</span></div>
      <div class="pair"><span class="label">Podiums:</span> <span class="value">${s.podiums}</span></div>
      <div class="pair"><span class="label">Avg Pos:</span> <span class="value">${avg}</span></div>
      <div class="pair"><span class="label">1st %:</span> <span class="value">${fPct}%</span></div>
      <div class="pair"><span class="label">Podium %:</span> <span class="value">${pPct}%</span></div>
    </div>`;
  }).join("");

  document.getElementById("circuit-list").innerHTML = `<h3>Circuits</h3>${circuitHTML.join("")}<h3>Stats by Circuit</h3>${byCircuitHTML}`;

  document.querySelectorAll(".rate-link").forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const circuitName = e.target.dataset.circuit;
      const trackName = trackParam; // from the URL
      const newRating = prompt(`Enter new rating for ${circuitName}:`);
      if (!newRating) return;
  
      try {
        const response = await fetch(webAppUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            mode: "rate",
            trackName: trackName,
            circuitName: circuitName,
            rating: newRating
          }).toString()
        });
  
        if (!response.ok) throw new Error("Failed to update rating");
  
        document.getElementById("rating-" + circuitName).textContent = newRating;
        alert("Rating updated!");
      } catch (error) {
        console.error("Rating update error:", error);
        alert("Failed to update rating.");
      }
    });
  });
  
  

  const rowsHTML = recent.map(r => {
    const driver = r[rCol("DriverName")] || "—";
    const team = driverToTeam[driver] || "—";
    const car = r[rCol("Car")] || "—";
    return `
    <tr>
      <td>${r[rCol("Position")] || "—"}</td>
      <td>${r[rCol("Circuit")] || "—"}</td>
      <td>${r[rCol("Chances")] || "—"}</td>
      <td>${r[rCol("RaceLevel")] || "—"}</td>
      <td>${r[rCol("RaceNo")] || "—"}</td>
      <td>${driver}</td>
      <td>${team}</td>
      <td>${car}</td>
      <td>${r[rCol("Date")] || "—"}</td>
    </tr>`;
  }).join("");

  document.getElementById("recent-races").innerHTML = `
    <h3>Recent Races</h3>
    <div class="table-container">
      <table class="race-table">
        <thead><tr><th>Pos</th><th>Circuit</th><th>Chances</th><th>Lvl</th><th>Round</th><th>Driver</th><th>Team</th><th>Car</th><th>Date</th></tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>
  `;
});
