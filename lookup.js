// Replace with your API endpoint or SharePoint URL where your Excel data is stored
const excelDataURL = 'https://1drv.ms/x/s!Ai6aEqiA-s-Bg8VHV7Vfz1ftSpWgzQ?e=NjEUSD';

document.getElementById('userLookupForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const badgeID = document.getElementById('badgeID').value;

    // Fetch Excel data using a library like fetch or axios
    fetch(excelDataURL)
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
            const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet

            // Parse the sheet into JSON format
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            let userName = 'Not Found';
            let onSite = '';

            // Loop through JSON data to find the user based on BadgeID
            for (const row of jsonData) {
                if (row.BadgeID === badgeID) {
                    userName = row.Name;
                    onSite = row['On Site'];
                    break;
                }
            }

            // Update the HTML elements
            document.getElementById('userName').textContent = userName;
            document.getElementById('onSite').textContent = onSite;
        });
});
