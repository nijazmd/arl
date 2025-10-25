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

  return output.setHeader("Access-Control-Allow-Origin", "*")
               .setHeader("Access-Control-Allow-Methods", "GET, POST")
               .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function doPost(e) {
  try {
    const mode = e.parameter.mode;

    if (mode === "rate") {
      const carName = e.parameter.carName;
      const circuitName = e.parameter.circuitName;
      const trackName = e.parameter.trackName;
      const newRating = e.parameter.rating;

      if (carName) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Cars");
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const carNameCol = headers.indexOf("CarName");
        const ratingCol = headers.indexOf("Rating");
        if (carNameCol === -1 || ratingCol === -1) throw new Error("Missing CarName or Rating column in Cars sheet");
        const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        const rowIndex = data.findIndex(row => row[carNameCol] === carName);
        if (rowIndex === -1) throw new Error("Car not found: " + carName);
        sheet.getRange(rowIndex + 2, ratingCol + 1).setValue(newRating);
        return ContentService.createTextOutput("Car rating updated").setMimeType(ContentService.MimeType.TEXT);
      }

      if (circuitName && trackName) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tracks");
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const trackCol = headers.indexOf("TrackName");
        const circuitCol = headers.indexOf("Circuit");
        const ratingCol = headers.indexOf("TrackRating");
        if (trackCol === -1 || circuitCol === -1 || ratingCol === -1) throw new Error("Missing columns in Tracks sheet");
        const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        const rowIndex = data.findIndex(row => row[trackCol] === trackName && row[circuitCol] === circuitName);
        if (rowIndex === -1) throw new Error(`Circuit not found: ${trackName} - ${circuitName}`);
        sheet.getRange(rowIndex + 2, ratingCol + 1).setValue(newRating);
        return ContentService.createTextOutput("Circuit rating updated").setMimeType(ContentService.MimeType.TEXT);
      }

      throw new Error("Missing required parameters for rating update");
    }

    // === Save RaceResults ===
    const rr = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RaceResults");
    const rrHeaders = rr.getRange(1, 1, 1, rr.getLastColumn()).getValues()[0];
    const data = e.parameter;

    // Support both existing sheets lacking CupID and newer ones with CupID
    const valueFor = (header) => {
      switch (header.trim()) {
        case 'RaceNo': return data.roundNumber || '';
        case 'Date': return new Date();
        case 'DriverName': return data.driverName || '';
        case 'Team': return data.team || '';
        case 'Car': return data.carName || '';
        case 'Track': return data.trackName || '';
        case 'Circuit': return data.circuitName || '';
        case 'Direction': return data.direction || '';
        case 'CupID': return data.CupID || '';
        case 'RaceLevel': return data.raceLevel || '';
        case 'Chances': return data.chances || '';
        case 'Position': return data.position || '';
        case 'Points': return data.points || '';
        case 'DisciplinaryPoints': return data.disciplinaryPoints || '';
        case 'Laps': return data.laps || '';
        case 'CupID': return data.CupID || ''; // "Weekly" for weekly, else actual CupID
        default: return '';
      }
    };

    const rowValues = rrHeaders.map(h => valueFor(h));
    rr.appendRow(rowValues);

    // === Update Cars sheet fields if provided ===
    const carName = data.carName;
    if (carName) {
      const cars = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Cars");
      const ch = cars.getRange(1, 1, 1, cars.getLastColumn()).getValues()[0];
      const col = (n) => ch.indexOf(n);
      const carCol = col("CarName");
      if (carCol !== -1) {
        const range = cars.getRange(2, 1, Math.max(cars.getLastRow()-1,0), cars.getLastColumn());
        const values = range.getValues();
        const idx = values.findIndex(r => r[carCol] === carName);
        if (idx !== -1) {
          const r = idx + 2;
          const dfCol = col("DriveFeel");
          const hdCol = col("Handling");
          const dzCol = col("Design");
          const shCol = col("shpp");
          const rhCol = col("rhpp");
          const mxCol = col("maxpp");
          const fvCol = col("Favourite");

          if (dfCol !== -1 && data.DriveFeel) cars.getRange(r, dfCol + 1).setValue(data.DriveFeel);
          if (hdCol !== -1 && data.Handling) cars.getRange(r, hdCol + 1).setValue(data.Handling);
          if (dzCol !== -1 && data.Design) cars.getRange(r, dzCol + 1).setValue(data.Design);
          if (shCol !== -1 && data.shpp) cars.getRange(r, shCol + 1).setValue(data.shpp);
          if (rhCol !== -1 && data.rhpp) cars.getRange(r, rhCol + 1).setValue(data.rhpp);
          if (mxCol !== -1 && data.maxpp) cars.getRange(r, mxCol + 1).setValue(data.maxpp);
          if (fvCol !== -1 && typeof data.Favourite !== "undefined") cars.getRange(r, fvCol + 1).setValue(String(data.Favourite).toUpperCase()==="TRUE");
        }
      }
    }

    // === Update TrackRating if provided ===
    const trackName = data.trackName;
    const circuitName = data.circuitName;
    const trackRating = data.TrackRating;
    if (trackName && circuitName && trackRating) {
      const t = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tracks");
      const th = t.getRange(1, 1, 1, t.getLastColumn()).getValues()[0];
      const col = n => th.indexOf(n);
      const trk = col("TrackName"), cir = col("Circuit"), rat = col("TrackRating");
      if (trk !== -1 && cir !== -1 && rat !== -1) {
        const vals = t.getRange(2, 1, Math.max(t.getLastRow()-1,0), t.getLastColumn()).getValues();
        const idx = vals.findIndex(r => r[trk] === trackName && r[cir] === circuitName);
        if (idx !== -1) t.getRange(idx + 2, rat + 1).setValue(trackRating);
      }
    }

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
