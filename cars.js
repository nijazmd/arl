// cars.js
const carsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2855635&single=true&output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

let carStatsMap = [];
let carListContainer;
let allCarRows = [];

document.addEventListener("DOMContentLoaded", async () => {
  carListContainer = document.getElementById("car-list");

  const sortRadios = document.querySelectorAll("input[name='car-sort']");
  const searchInput = document.getElementById("car-search");

  sortRadios.forEach(radio =>
    radio.addEventListener("change", () => {
      const selected = document.querySelector("input[name='car-sort']:checked").value;
      renderCarCards(selected);
    })
  );

  searchInput.addEventListener("input", () => {
    const selected = document.querySelector("input[name='car-sort']:checked").value;
    renderCarCards(selected);
  });

  document.getElementById("filter-toggle").addEventListener("click", () => {
    document.getElementById("filter-panel").classList.toggle("hidden");
  });

  document.getElementById("apply-filters").addEventListener("click", () => {
    applyFiltersAndRender();
    document.getElementById("filter-panel").classList.add("hidden");
  });

  await loadAndRenderCars();
});

async function loadAndRenderCars() {
  try {
    const [carsResponse, raceResponse] = await Promise.all([
      fetch(carsSheetURL),
      fetch(raceResultsSheetURL)
    ]);

    const [carsText, raceText] = await Promise.all([
      carsResponse.text(),
      raceResponse.text()
    ]);

    const carRows = carsText.split("\n").map(row => row.split(",").map(s => s.replace(/"/g, "").trim()));
    const raceRows = raceText.split("\n").map(row => row.split(",").map(s => s.replace(/"/g, "").trim()));

    const carHeaders = carRows[0];
    const raceHeaders = raceRows[0];
    const carData = carRows.slice(1);
    const raceData = raceRows.slice(1);

    const carCol = (name) => carHeaders.indexOf(name);
    const raceCol = (name) => raceHeaders.indexOf(name);

    const raceStats = {};
    raceData.forEach(row => {
      const car = row[raceCol("Car")];
      const pos = parseInt(row[raceCol("Position")], 10);
      const dp = parseFloat(row[raceCol("DisciplinaryPoints")]) || 0;
      const chances = parseInt(row[raceCol("Chances")], 10);
      if (!car) return;

      if (!raceStats[car]) raceStats[car] = { total: 0, podiums: 0, positionSum: 0, validPositions: 0, disciplinary: 0, chancesSum: 0 };

      raceStats[car].total++;
      if ([1, 2, 3].includes(pos)) raceStats[car].podiums++;
      if (!isNaN(pos)) {
        raceStats[car].positionSum += pos;
        raceStats[car].validPositions++;
      }
      if (!isNaN(chances)) {
        raceStats[car].chancesSum += chances;
      }

      raceStats[car].disciplinary += dp;
    });

    carStatsMap = carData.map(row => {
      const carName = row[carCol("CarName")];
      const carMake = row[carCol("CarMake")];
      const year = row[carCol("Year")];
      const country = row[carCol("Country")];
      const imageUrl = row[carCol("ImageURL")];
      const rating = row[carCol("Rating")];

      const stats = raceStats[carName] || { total: 0, podiums: 0, positionSum: 0, validPositions: 0, disciplinary: 0, chancesSum: 0 };
      const podiumPct = stats.total ? (stats.podiums / stats.total) * 100 : 0;
      const positionAvg = stats.validPositions ? (stats.positionSum / stats.validPositions) : 0;
      const discAvg = stats.total ? (stats.disciplinary / stats.total).toFixed(2) : "0.00";
      const chancesPerRace = stats.total ? (stats.chancesSum / stats.total).toFixed(2) : "0.00";

      const hasLevel5Race = raceData.some(row => row[raceCol("Car")] === carName && row[raceCol("RaceLevel")] === "5");

      return {
        carName, carMake, year, country, imageUrl, rating,
        totalRaces: stats.total,
        podiumPct,
        positionAvg,
        discAvg,
        hasLevel5Race,
        chancesPerRace
      };
    });

    allCarRows = carData;
    allCarRows.unshift(carHeaders); 
    generateFilterPanel(carHeaders, carData);

    renderCarCards("rating");
  } catch (error) {
    console.error("Failed to load car data:", error);
    carListContainer.innerHTML = "<p>Failed to load car data.</p>";
  }
}

function generateFilterPanel(carHeaders, carData) {
  const filterPanel = document.getElementById("filter-content");

  const rangeFields = ["DriveFeel", "Performance", "Handling", "Design", "shpp", "smpp", "sspp", "rhpp", "rmpp", "rspp", "Year", "Displacement", "Power", "Torque", "Weight"];
  const checkboxFields = carHeaders.filter(h => !rangeFields.includes(h) && !["CarName", "CarMake", "ImageURL", "VideoURL"].includes(h));

  function createAccordionSection(label, contentHTML) {
    return `
      <div class="accordion-section">
        <div class="accordion-header">${label}</div>
        <div class="accordion-body">${contentHTML}</div>
      </div>
    `;
  }

  let rangeHTML = "";
  rangeFields.forEach(field => {
    const idx = carHeaders.indexOf(field);
    if (idx === -1) return;

    let values = carData.map(r => parseFloat(r[idx])).filter(v => !isNaN(v));
    if (!values.length) return;

    const min = Math.min(...values);
    const max = Math.max(...values);

    rangeHTML += `
      <label>${field}</label><br>
      <input type="number" id="min-${field}" placeholder="Min" value="${min}" style="width: 40%"/> –
      <input type="number" id="max-${field}" placeholder="Max" value="${max}" style="width: 40%"/><br><br>
    `;
  });
  filterPanel.innerHTML += createAccordionSection("Range Filters", rangeHTML);

  checkboxFields.forEach(field => {
    const idx = carHeaders.indexOf(field);
    const counts = {};

    carData.forEach(row => {
      const val = row[idx] || "Unknown";
      counts[val] = (counts[val] || 0) + 1;
    });

    const checkboxes = Object.entries(counts).map(([val, count]) => {
      const id = `${field}-${val}`.replace(/[^a-zA-Z0-9]/g, "_");
      return `
        <label>
          <input type="checkbox" name="${field}" value="${val}" id="${id}" />
          ${val} (${count})
        </label><br>
      `;
    }).join("");

    filterPanel.innerHTML += createAccordionSection(field, checkboxes);
  });

  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener("click", () => {
      const body = header.nextElementSibling;
      body.classList.toggle("open");
    });
  });
}

function isCarMatchingFilters(car) {
  const carRow = allCarRows.find(r => r.includes(car.carName));
  if (!carRow) return true;

  let pass = true;

  const rangeFields = ["DriveFeel", "Performance", "Handling", "Design", "shpp", "smpp", "sspp", "rhpp", "rmpp", "rspp", "Year", "Displacement", "Power", "Torque", "Weight"];

  rangeFields.forEach(field => {
    const idx = allCarRows[0].indexOf(field);
    if (idx === -1) return;

    const val = parseFloat(carRow[idx]);
    const min = parseFloat(document.getElementById(`min-${field}`)?.value);
    const max = parseFloat(document.getElementById(`max-${field}`)?.value);

    if (!isNaN(min) && val < min) pass = false;
    if (!isNaN(max) && val > max) pass = false;
  });

  document.querySelectorAll("input[type='checkbox']:checked").forEach(cb => {
    const field = cb.name;
    const val = cb.value;
    const idx = allCarRows[0].indexOf(field);
    if (idx === -1) return;

    const valInRow = carRow[idx];
    if (valInRow !== val) pass = false;
  });

  return pass;
}

function applyFiltersAndRender() {
  const selected = document.querySelector("input[name='car-sort']:checked")?.value || "rating";
  renderCarCards(selected);
}

function renderCarCards(sortOption) {
  const searchText = document.getElementById("car-search").value.toLowerCase();
  let filteredCars = [...carStatsMap].filter(car =>
    (car.carName.toLowerCase().includes(searchText) || car.carMake.toLowerCase().includes(searchText)) &&
    isCarMatchingFilters(car)
  );

  const sortWithMinRaceCheck = ['positionAvg', 'podiumPct'];
  if (sortWithMinRaceCheck.includes(sortOption)) {
    filteredCars = filteredCars.filter(car => car.totalRaces >= 5);
  }

  switch (sortOption) {
    case "positionAvg":
      filteredCars.sort((a, b) => a.positionAvg - b.positionAvg);
      break;
    case "podiumPct":
      filteredCars.sort((a, b) => b.podiumPct - a.podiumPct);
      break;
    case "carName":
      filteredCars.sort((a, b) => a.carName.localeCompare(b.carName));
      break;
    case "makeName":
      filteredCars.sort((a, b) => a.carMake.localeCompare(b.carMake));
      break;
    case "totalRaces":
      filteredCars.sort((a, b) => b.totalRaces - a.totalRaces);
      break;
    case "country":
      filteredCars.sort((a, b) => a.country.localeCompare(b.country));
      break;
    case "rating":
      filteredCars.sort((a, b) => {
        const ra = parseFloat(a.rating) || 0;
        const rb = parseFloat(b.rating) || 0;
        return rb - ra;
      });
      break;
  }

  const cardsHTML = filteredCars.map(car => {
    const isTrophy = car.podiumPct === 100 && car.totalRaces >= 5;
    const ratingClass = car.hasLevel5Race ? 'rating-bright' : 'rating-muted';

    return `
      <div class="car-card${isTrophy ? ' highlight' : ''}">
        ${car.imageUrl ? `<img src="${car.imageUrl}" alt="${car.carName}" class="car-image" />` : ""}
        <div class="car-info">
          <div class="car-make">${car.carMake}</div>
          <div class="car-name">
            <a href="car-single.html?car=${encodeURIComponent(car.carName)}">${car.carName}</a>
            ${isTrophy ? '<span class="badge">🏆</span>' : ''}
          </div>
          <div class="info-row">
            <div class="car-meta">Country: ${car.country || "—"}</div>
            <div class="car-meta">Rating: <span class="${ratingClass}">${car.rating || "—"}</span></div>
          </div>
          <div class="info-row">
            <div class="car-meta">Total Races: ${car.totalRaces}</div>
            <div class="car-meta">Disciplinary Avg: ${car.discAvg || "0.00"}</div>
          </div>
          <div class="info-row">
            <div class="car-meta">Podium %: ${car.podiumPct.toFixed(1)}%</div>
            <div class="car-meta">Position Avg: ${car.positionAvg.toFixed(2)}</div>
          </div>
          <div class="info-row">
            <div class="car-meta">Chances / Race: ${car.chancesPerRace}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  carListContainer.innerHTML = cardsHTML;
}
