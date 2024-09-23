// backend.js

// Function to fetch access token from SharePoint (if necessary)
// Step 1: Authenticate and get access token (adjust for your corporate setup)
async function getAccessToken() {
    const authUrl = "https://login.microsoftonline.com/{tenant}/oauth2/token";
    const clientId = "YOUR_CLIENT_ID";
    const clientSecret = "YOUR_CLIENT_SECRET";
    const resource = "https://share.amazon.com";
    const grantType = "client_credentials";
    
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        resource: resource,
        grant_type: grantType
    });

    const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    if (response.ok) {
        const data = await response.json();
        return data.access_token;
    } else {
        console.error("Failed to get access token:", response.statusText);
        throw new Error("Failed to authenticate with SharePoint.");
    }
}


// Function to check if the CSV file exists in SharePoint
async function checkCSVFileExists() {
    const fileUrl = "https://share.amazon.com/sites/DCG2/Shared%20Documents/APPS%20%26%20Tools/BreakTimeTracker/BreakTimeData.csv";

    const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
            "Accept": "application/json;odata=verbose"
        },
        credentials: 'include' // This allows the browser to send cookies with the request
    });

    if (response.ok) {
        console.log("CSV file exists.");
        return true;
    } else if (response.status === 404) {
        console.warn("CSV file not found.");
        return false;
    } else {
        console.error("Error checking file:", response.statusText);
        throw new Error("Error checking CSV file existence.");
    }
}



// Function to update the CSV file with new data
async function updateCSVFile(csvData, accessToken) {
    const uploadUrl = "/sites/DCG2/Shared Documents/APPS & Tools/BreakTimeTracker/BreakTimeData.csv";

    const requestOptions = {
        method: 'PUT',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "If-Match": "*", // Ensures file gets updated
            "Content-Type": "text/csv"
        },
        body: csvData
    };

    const response = await fetch(`https://share.amazon.com/_api/web/GetFileByServerRelativeUrl('${uploadUrl}')/$value`, requestOptions);

    if (response.ok) {
        console.log("CSV file updated successfully!");
    } else {
        console.error("Error updating CSV file:", response.statusText);
        throw new Error("Failed to update CSV file.");
    }
}


// Function to manage the whole process
async function storeBreakData(badgeId, breakStart, breakEnd, breakDuration) {
    try {
        const data = {
            badgeId: badgeId,
            breakStart: breakStart.toISOString(),  // Ensure proper formatting for dates
            breakEnd: breakEnd.toISOString(),
            breakDuration: breakDuration
        };

        const response = await fetch('/api/storeBreakData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error('Data storage failed.');
        }

        return result;
    } catch (error) {
        console.error('Error storing break data:', error);
        throw error;
    }
}



// Utility functions (generate unique ID, format date)
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatDate(date) {
    const options = { month: '2-digit', day: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
