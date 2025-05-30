const carsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=2855635&single=true&output=csv";
const raceResultsSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";

let carStatsMap = [];
let carListContainer;

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
      if (!car) return;

      if (!raceStats[car]) raceStats[car] = { total: 0, podiums: 0, positionSum: 0, validPositions: 0, disciplinary: 0 };
      raceStats[car].total++;
      if ([1, 2, 3].includes(pos)) raceStats[car].podiums++;
      if (!isNaN(pos)) {
        raceStats[car].positionSum += pos;
        raceStats[car].validPositions++;
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
    
      const stats = raceStats[carName] || { total: 0, podiums: 0, positionSum: 0, validPositions: 0, disciplinary: 0 };
      const podiumPct = stats.total ? (stats.podiums / stats.total) * 100 : 0;
      const positionAvg = stats.validPositions ? (stats.positionSum / stats.validPositions) : 0;
      const discAvg = stats.total ? (stats.disciplinary / stats.total).toFixed(2) : "0.00";
    
      // Level 5 check
      const hasLevel5Race = raceData.some(row => row[raceCol("Car")] === carName && row[raceCol("RaceLevel")] === "5");
    
      return {
        carName, carMake, year, country, imageUrl, rating,
        totalRaces: stats.total,
        podiumPct,
        positionAvg,
        discAvg,
        hasLevel5Race
      };
    });
    

    renderCarCards("rating");
  } catch (error) {
    console.error("Failed to load car data:", error);
    carListContainer.innerHTML = "<p>Failed to load car data.</p>";
  }
}

function renderCarCards(sortOption) {
  const searchText = document.getElementById("car-search").value.toLowerCase();
  let filteredCars = [...carStatsMap].filter(car =>
    car.carName.toLowerCase().includes(searchText) ||
    car.carMake.toLowerCase().includes(searchText)
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
        </div>
      </div>
    `;
  }).join("");

  carListContainer.innerHTML = cardsHTML;
}

