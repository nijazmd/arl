// Get the driver name from the URL
const params = new URLSearchParams(window.location.search);
const driverName = params.get('name');

// Set the title
document.getElementById('driverNameTitle').innerText = driverName + " - Race Results";

// Your Sheet URL
const sheetID = '1I42Q0kFCoNjoS3jey1N7bTBAmWs6TJK8373yBkhGlso';
const sheetName = 'RaceResults'; // Assuming you store race results separately
const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

async function fetchRaceResults() {
    const response = await fetch(url);
    const data = await response.text();
    const rows = data.split('\n').slice(1);

    let tableRows = '';

    let raceNumber = 1;

    rows.forEach(row => {
        const columns = row.split(',');
        const currentDriver = columns[0]?.trim();
        if (currentDriver === driverName) {
            const raceLevel = columns[1] || '';
            const car = columns[2] || '';
            const result = columns[3] || '';

            tableRows += `
                <tr>
                    <td>${raceNumber++}</td>
                    <td>${raceLevel}</td>
                    <td>${car}</td>
                    <td>${result}</td>
                </tr>
            `;
        }
    });

    document.getElementById('racesBody').innerHTML = tableRows;
}

fetchRaceResults();
