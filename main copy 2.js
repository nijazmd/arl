// CONFIG
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv"; // Driver sheet (CSV download)
const webAppUrl = "https://script.google.com/macros/s/AKfycbwKrmawcfmLnDpRp6rg5OB62pFB1NiBwjP4JGNp1hE7VN560hrNUffM15Iab_B02jzsng/exec"; // Web App URL

// Populate Drivers
document.addEventListener('DOMContentLoaded', populateDriverDropdown);

async function populateDriverDropdown() {
    try {
      const response = await fetch(sheetURL);
      const data = await response.text();
      const rows = data.split("\n").slice(1); // skipping header
      const driverSelect = document.getElementById("driverName");
  
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
  
  async function populateCurrentRound() {
    try {
      const response = await fetch(sheetURL);
      const data = await response.text();
      const rows = data.split("\n").slice(1); // Skip header
      const numEntries = rows.length;
      const currentRound = Math.floor(numEntries / 20) + 1;
  
      document.getElementById('roundNumber').value = currentRound;
    } catch (error) {
      console.error("Error fetching current round:", error);
    }
  }

  
  document.addEventListener("DOMContentLoaded", () => {
    populateDriverDropdown();
    populateCurrentRound(); // ← Add this
  });

  
// Open and Close Form
function openForm() {
  document.getElementById("popupForm").style.display = "block";
}

function closeForm() {
  document.getElementById("popupForm").style.display = "none";
  document.getElementById("raceForm").reset();
}

// Submit Race Result
async function submitRaceResult(event) {
    event.preventDefault();
    
    const roundNumber = document.getElementById('roundNumber').value;
    const driverName = document.getElementById('driverName').value;
    const raceLevel = document.querySelector('input[name="raceLevel"]:checked')?.value;
    const chances = document.querySelector('input[name="chances"]:checked')?.value;
    const position = document.querySelector('input[name="position"]:checked')?.value;
    const points = calculatePoints(position, chances);
  
    if (!driverName || !raceLevel || !chances || !position || !roundNumber) {
      alert("Please fill out all fields.");
      return;
    }
  
    const formData = new FormData();
    formData.append('roundNumber', roundNumber);
    formData.append('driverName', driverName);
    formData.append('raceLevel', raceLevel);
    formData.append('chances', chances);
    formData.append('position', position);
    formData.append('points', points);
  
    try {
      const response = await fetch(webAppUrl, {
        method: "POST",
        body: formData,
        mode: "no-cors" // Needed for Google Apps Script
      });
  
      alert("Race Result Added Successfully!");
      closeForm();
    } catch (error) {
      console.error("Error submitting race:", error);
      alert("Failed to submit race result. Try again.");
    }
  }
  

// Points Calculation
function calculatePoints(position, chances) {
    const pointsTable = {
      1: { 1: 54, 2: 44, 3: 36, 4: 30, 5: 24 }, // Position 1
      2: { 1: 27, 2: 22, 3: 18, 4: 15, 5: 12 }, // Position 2
      3: { 1: 20, 2: 16, 3: 12, 4: 10, 5: 8 },  // Position 3
      4: { 1: 11, 2: 8, 3: 6, 4: 4, 5: 2 },     // Position 4
      5: { 1: 8, 2: 5, 3: 3, 4: 2, 5: 1 }       // Position 5
    };
  
    const pos = parseInt(position, 10);
    const chance = parseInt(chances, 10);
  
    return (pointsTable[pos] && pointsTable[pos][chance]) ? pointsTable[pos][chance] : 0;
  }
  
