const tracksSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2013785235&single=true&output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

let trackListContainer;
let currentTracks = [];

document.addEventListener("DOMContentLoaded", async () => {
  trackListContainer = document.getElementById("track-list");

  const sortRadios = document.querySelectorAll("input[name='track-sort']");
  sortRadios.forEach(radio =>
    radio.addEventListener("change", () => {
      const selected = document.querySelector("input[name='track-sort']:checked").value;
      renderTrackCards(currentTracks, selected);
    })
  );

  await loadAndRenderTracks();
});

async function loadAndRenderTracks() {
  const [trackRes, raceRes] = await Promise.all([
    fetch(tracksSheetURL).then(r => r.text()),
    fetch(raceResultsSheetURL).then(r => r.text())
  ]);

  const trackLines = trackRes.split("\n").map(row => row.split(",").map(cell => cell.replace(/"/g, "").trim()));
  const raceLines = raceRes.split("\n").map(row => row.split(",").map(cell => cell.replace(/"/g, "").trim()));

  const trackHeaders = trackLines[0];
  const trackData = trackLines.slice(1);
  const raceHeaders = raceLines[0];
  const raceData = raceLines.slice(1);

  const tcol = (name) => trackHeaders.indexOf(name);
  const rcol = (name) => raceHeaders.indexOf(name);

  const trackMap = {};

  // Group by TrackName
  trackData.forEach(row => {
    const name = row[tcol("TrackName")];
    if (!trackMap[name]) {
      trackMap[name] = {
        country: row[tcol("Country")],
        circuits: new Set(),
        distances: [],
        ratings: [],
        totalRaces: 0,
        podiums: 0,
        positionSum: 0,
        validPositions: 0,
        disciplinarySum: 0
      };
    }
    const t = trackMap[name];
    t.circuits.add(row[tcol("Circuit")]);
    if (row[tcol("Distance")]) t.distances.push(row[tcol("Distance")]);
    const rating = parseFloat(row[tcol("TrackRating")]);
    if (!isNaN(rating)) t.ratings.push(rating);
  });

  // Add race data
  raceData.forEach(row => {
    const track = row[rcol("Track")];
    const pos = parseInt(row[rcol("Position")], 10);
    const disc = parseInt(row[rcol("DisciplinaryPoints")], 10);
    if (!trackMap[track]) return;
    const t = trackMap[track];
    t.totalRaces++;
    if ([1, 2, 3].includes(pos)) t.podiums++;
    if (!isNaN(pos)) {
      t.positionSum += pos;
      t.validPositions++;
    }
    if (!isNaN(disc)) {
      t.disciplinarySum += disc;
    }
  });

  const tracks = Object.entries(trackMap).map(([name, t]) => {
    const avgRating = t.ratings.length ? Math.round(t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length) : 0;
    const podiumPct = t.totalRaces ? (t.podiums / t.totalRaces * 100).toFixed(1) : "0.0";
    const positionAvg = t.validPositions ? (t.positionSum / t.validPositions).toFixed(2) : "—";
    const discAvg = t.totalRaces ? (t.disciplinarySum / t.totalRaces).toFixed(2) : "0.00";
    return {
      name,
      country: t.country,
      circuits: Array.from(t.circuits).join(", "),
      distance: t.distances[0] || "—",
      avgRating,
      totalRaces: t.totalRaces,
      podiumPct,
      positionAvg,
      discAvg
    };
  });

  currentTracks = tracks;
  renderTrackCards(currentTracks, "rating");
}

function renderTrackCards(tracks, sortBy = "rating") {
  switch (sortBy) {
    case "name":
      tracks.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "races":
      tracks.sort((a, b) => b.totalRaces - a.totalRaces);
      break;
    case "positionAvg":
      tracks.sort((a, b) => parseFloat(a.positionAvg) - parseFloat(b.positionAvg));
      break;
    default: // rating
      tracks.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  }

  trackListContainer.innerHTML = tracks.map(track => `
    <div class="car-card">
      <div class="car-info">
        <div class="car-make">${track.name}</div>
        <div class="car-name">
          <a href="track-single.html?track=${encodeURIComponent(track.name)}">${track.circuits}</a>
        </div>
        <div class="car-meta">Country: ${track.country || "—"}</div>
        <div class="car-meta">Distance: ${track.distance}</div>
        <div class="car-meta">Rating: ${track.avgRating}</div>
        <div class="car-meta">Total Races: ${track.totalRaces}</div>
        <div class="car-meta">Disciplinary Avg: ${track.discAvg}</div>
        <div class="car-meta">Podium %: ${track.podiumPct}%</div>
        <div class="car-meta">Position Avg: ${track.positionAvg}</div>
      </div>
    </div>
  `).join("");
}
