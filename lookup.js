// Replace with your API endpoint or SharePoint URL where your Excel data is stored
const excelDataURL = 'https://your-sharepoint-site/excel-data.csv';

document.getElementById('userLookupForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const badgeID = document.getElementById('badgeID').value;

    // Fetch Excel data using a library like fetch or axios
    fetch(excelDataURL)
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n');
            let userName = 'Not Found';
            let onSite = '';

            // Loop through data to find the user based on BadgeID
            for (const row of rows) {
                const columns = row.split(',');
                if (columns[0] === badgeID) {
                    userName = columns[1];
                    onSite = columns[2];
                    break;
                }
            }

            // Update the HTML elements
            document.getElementById('userName').textContent = userName;
            document.getElementById('onSite').textContent = onSite;
        });
});
