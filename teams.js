function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Drivers");
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const drivers = data.map(row => row[0]);
  
  const output = ContentService.createTextOutput(JSON.stringify({ drivers }))
    .setMimeType(ContentService.MimeType.JSON);

  // CORS headers
  return output.setHeader("Access-Control-Allow-Origin", "*")
               .setHeader("Access-Control-Allow-Methods", "GET, POST")
               .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RaceResults");
    const data = e.parameter;

    const roundNumber = data.roundNumber || '';
    const driverName = data.driverName || '';
    const team = data.team || '';
    const carName = data.carName || '';
    const trackName = data.trackName || '';
    const circuit = data.circuitName || ''; // ✅ this was missing
    const direction = data.direction || ''; // ✅ now correctly included
    const raceLevel = data.raceLevel || '';
    const chances = data.chances || '';
    const position = data.position || '';
    const points = data.points || '';
    const disciplinaryPoints = data.disciplinaryPoints || ''; // ✅ ADD THIS

    // Insert the data into the correct columns
    sheet.appendRow([
      roundNumber,         // 1. Race No
      new Date(),          // 2. Date
      driverName,          // 3. Driver Name
      team,                // 4. Team
      carName,             // 5. Car
      trackName,           // 6. Track
      circuit,             // 7. Circuit
      direction,           // 8. Direction
      raceLevel,           // 9. Race Level
      chances,             // 10. Chances
      position,            // 11. Position
      points,              // 12. Points
      disciplinaryPoints   // 13. Disciplinary
    ]);

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput("Error: " + error).setMimeType(ContentService.MimeType.TEXT);
  }
}

