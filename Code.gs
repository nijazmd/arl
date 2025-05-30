function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Drivers");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const driverNameIndex = headers.indexOf("DriverName");

  if (driverNameIndex === -1) {
    return ContentService.createTextOutput("Error: 'DriverName' column not found")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const numRows = sheet.getLastRow() - 1;
  const dataRange = sheet.getRange(2, 1, numRows, sheet.getLastColumn());
  const allData = dataRange.getValues();

  const drivers = allData
    .map(row => row[driverNameIndex])
    .filter(name => name && name.toString().trim() !== "");

  const output = ContentService.createTextOutput(JSON.stringify({ drivers }))
    .setMimeType(ContentService.MimeType.JSON);

  // Add CORS headers
  return output.setHeader("Access-Control-Allow-Origin", "*")
               .setHeader("Access-Control-Allow-Methods", "GET, POST")
               .setHeader("Access-Control-Allow-Headers", "Content-Type");
}


function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RaceResults");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = e.parameter;

    const values = headers.map(header => {
      switch (header.trim()) {
        case 'RaceNo': return data.roundNumber || '';
        case 'Date': return new Date(); // always current date
        case 'DriverName': return data.driverName || '';
        case 'Team': return data.team || '';
        case 'Car': return data.carName || '';
        case 'Track': return data.trackName || '';
        case 'Circuit': return data.circuitName || '';
        case 'Direction': return data.direction || '';
        case 'RaceLevel': return data.raceLevel || '';
        case 'Chances': return data.chances || '';
        case 'Position': return data.position || '';
        case 'Points': return data.points || '';
        case 'DisciplinaryPoints': return data.disciplinaryPoints || '';
        default: return '';
      }
    });

    sheet.appendRow(values);

    return ContentService.createTextOutput("Success")
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, POST")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");

  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput("Error: " + error)
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, POST")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}


