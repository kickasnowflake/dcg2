function searchBadgeID() {
    var badgeId = document.getElementById("badgeIdInput").value;
    var apiUrl = "https://pomry.sharepoint.com/:x:/r/sites/ADM-Canada/_api/web/GetFileByServerRelativeUrl('/sites/ADM-Canada/Shared%20Documents/Book.xlsx')/Sheets('Sheet1')";

    $.ajax({
        url: apiUrl,
        method: "GET",
        headers: {
            "Accept": "application/json; odata=verbose"
        },
        success: function (data) {
            if (data.d && data.d.Value && data.d.Value.length > 0) {
                var result = data.d.Value.find(function (row) {
                    return row.BadgeID === badgeId;
                });

                if (result) {
                    document.getElementById("result").innerHTML = "Name: " + result.Name;
                } else {
                    document.getElementById("result").innerHTML = "BadgeID not found.";
                }
            } else {
                document.getElementById("result").innerHTML = "No data found.";
            }
        },
        error: function (error) {
            console.log("Error: " + JSON.stringify(error));
            document.getElementById("result").innerHTML = "An error occurred: " + error.statusText;
        }
    });
}
