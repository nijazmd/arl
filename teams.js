const sheetID = '1I42Q0kFCoNjoS3jey1N7bTBAmWs6TJK8373yBkhGlso'; // Your Google Sheet ID
const sheetName = 'Drivers'; // Sheet name
const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

async function fetchDriversData() {
    const response = await fetch(url);
    const data = await response.text();
    const rows = data.split('\n').slice(1);

    let tableRows = '';

    rows.forEach(row => {
        const columns = row.split(',');
        if (columns.length > 1) { // skip empty rows
            const driverName = columns[0].trim();
            const teamName = columns[1]?.trim() || '';
            const RL1 = columns[2] || 0;
            const RL2 = columns[3] || 0;
            const RL3 = columns[4] || 0;
            const RL4 = columns[5] || 0;
            const RL5 = columns[6] || 0;
            const totalRaces = parseInt(RL1) + parseInt(RL2) + parseInt(RL3) + parseInt(RL4) + parseInt(RL5);
            const chances = columns[7] || 0;
            const first = columns[8] || 0;
            const second = columns[9] || 0;
            const third = columns[10] || 0;
            const totalPodiums = parseInt(first) + parseInt(second) + parseInt(third);
            const chancePerRace = totalRaces ? (chances / totalRaces).toFixed(2) : 0;
            const points = columns[11] || 0;
            const pointsAvg = totalRaces ? (points / totalRaces).toFixed(2) : 0;

            tableRows += `
                <tr>
                    <td><a href="driver.html?name=${encodeURIComponent(driverName)}">${driverName}</a></td>
                    <td>${teamName}</td>
                    <td>${RL1}</td>
                    <td>${RL2}</td>
                    <td>${RL3}</td>
                    <td>${RL4}</td>
                    <td>${RL5}</td>
                    <td>${totalRaces}</td>
                    <td>${chances}</td>
                    <td>${first}</td>
                    <td>${second}</td>
                    <td>${third}</td>
                    <td>${totalPodiums}</td>
                    <td>${chancePerRace}</td>
                    <td>${points}</td>
                    <td>${pointsAvg}</td>
                </tr>
            `;
        }
    });

    document.getElementById('driversBody').innerHTML = tableRows;
}

fetchDriversData();
