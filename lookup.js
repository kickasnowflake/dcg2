document.getElementById('userLookupForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const BadgeID = document.getElementById('BadgeID').value;

    // SharePoint URL to your Excel file
    const sharePointExcelURL = 'https://pomry.sharepoint.com/:x:/r/sites/ADM-Canada/Shared%20Documents/Book.xlsx?d=we3e3113235014887b2cb757de12ffcf0&csf=1&web=1&e=Z7pbkF';

    // REST API URL to access Excel data
    const excelDataAPI = `${sharePointExcelURL}/_vti_bin/ExcelRest.aspx/YourExcelSheet/Table?$filter=BadgeID eq '${BadgeID}'`;

    fetch(excelDataAPI, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        // Process the retrieved data
        if (data && data.d && data.d.results.length > 0) {
            const result = data.d.results[0];
            const Name = result.Name;
            const OnSite = result['OnSite'];

            // Update the HTML elements
            document.getElementById('Name').textContent = Name;
            document.getElementById('OnSite').textContent = OnSite;
        } else {
            // Handle the case when BadgeID is not found
            document.getElementById('Name').textContent = 'Not Found';
            document.getElementById('OnSite').textContent = '';
        }
    })
    .catch(error => {
        console.error(error);
    });
});
