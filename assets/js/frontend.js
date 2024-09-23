import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBnUee9kdggvNecjXu1G1m4MjMKuBY-ZCE",
    authDomain: "breaktimetracker-7ee0a.firebaseapp.com",
    projectId: "breaktimetracker-7ee0a",
    storageBucket: "breaktimetracker-7ee0a.appspot.com",
    messagingSenderId: "633250605076",
    appId: "1:633250605076:web:d8dbbc0ed8346969825f01"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getFirestore(app);

let allowedBreakDuration = 0;
const employeeBreaks = {};
let employeesOnBreak = 0;
let employeesReturned = 0;

// Function to synchronize break records from Firestore, filtered by today's date
function syncBreakRecords() {
    const breakRecordsRef = collection(database, "breakRecords");
    const today = new Date().toLocaleDateString('en-GB'); // Format: dd/mm/yyyy

    onSnapshot(breakRecordsRef, (snapshot) => {
        const breakRecords = snapshot.docs
            .map(doc => doc.data())
            .filter(record => record.date === today); // Filter records for today's date
        // Update UI with the filtered data
        updateBreakHistoryUI(breakRecords);
    });
}

// Fetch and display existing break records, filtered by today's date
async function fetchExistingRecords() {
    const breakRecordsRef = collection(database, "breakRecords");
    const snapshot = await getDocs(breakRecordsRef);
    const today = new Date().toLocaleDateString('en-GB'); // Format: dd/mm/yyyy

    const breakRecords = snapshot.docs
        .map(doc => doc.data())
        .filter(record => record.date === today); // Filter records for today's date
    updateBreakHistoryUI(breakRecords);
}


// Call the functions to sync and fetch existing records
syncBreakRecords();
fetchExistingRecords();

document.getElementById("set-duration-btn").addEventListener("click", function() {
    const durationInput = document.getElementById("break-duration").value;
    const duration = parseInt(durationInput);

    if (durationInput && duration >= 1) {
        allowedBreakDuration = duration;
        document.getElementById("message").textContent = `Allowed break duration set to ${allowedBreakDuration} minutes.`;

        // Show the scan section and hide the duration input section
        document.getElementById("duration-section").style.display = 'none';
        document.getElementById("scan-section").style.display = 'block';

        // Focus on the Badge ID input field for badge scanning
        document.getElementById("employee-id").focus();
    } else {
        alert("Please enter a valid break duration of at least 1 minute.");
    }
});

// Listen for Enter key to submit Badge ID
document.getElementById("scan-form").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();  // Prevent default form submission behavior
        const badgeId = document.getElementById("employee-id").value;

        if (badgeId) {
            trackBreakTime(badgeId);
        } else {
            alert("Please enter a valid Badge ID.");
        }
    }
});

function trackBreakTime(badgeId) {
    const currentTime = new Date();
    const today = new Date().toLocaleDateString('en-GB'); // Format: dd/mm/yyyy

    if (employeeBreaks[badgeId] && employeeBreaks[badgeId].onBreak) {
        // Employee returning from break
        const breakStart = employeeBreaks[badgeId].startTime;
        const breakDuration = Math.round((currentTime - breakStart) / 60000); // Minutes

        console.log(`Break duration for ${badgeId}: ${breakDuration} minutes`);

        if (breakDuration < allowedBreakDuration) {
            const remainingTime = allowedBreakDuration - breakDuration;
            const breakEndTime = new Date(breakStart.getTime() + allowedBreakDuration * 60000);
            console.log(`Remaining time for ${badgeId}: ${remainingTime} minutes`);
            alert(`Employee ${badgeId} still has ${remainingTime} minutes of break left. Break will end at ${breakEndTime.toLocaleTimeString()}.`);
            return;
        }

        document.getElementById("message").textContent = `Employee ${badgeId} returned from break. Break Duration: ${breakDuration} minutes.`;

        // Add the break record to history
        addToBreakHistory(badgeId, breakStart, currentTime, breakDuration);

        // Prepare data for Firestore
        const breakData = {
            badgeId: badgeId,
            breakStart: breakStart.toISOString(),
            breakEnd: currentTime.toISOString(),
            breakDuration: breakDuration,
            date: today  // Adding today's date as a string
        };

        console.log("Preparing to write to Firestore:", breakData);

        // Write to Firestore
        setDoc(doc(database, "breakRecords", badgeId + "_" + breakStart.getTime()), breakData)
            .then(() => {
                console.log("Break data successfully saved to Firestore.");
            })
            .catch(error => {
                console.error("Error storing break data:", error);
                document.getElementById("message").textContent = `There was an error storing break data: ${error.message}. Please contact support.`;
            });

        // Check if the employee exceeded their allowed break duration
        if (breakDuration > allowedBreakDuration + 5) {
            addToExceededList(badgeId, breakDuration);
        }

        // Update totals only if this is the first return scan
        if (!employeeBreaks[badgeId].returned) {
            employeesOnBreak--;
            employeesReturned++;
            employeeBreaks[badgeId].returned = true;
        }

        // Update the latest end time
        employeeBreaks[badgeId].endTime = currentTime;

        // Update UI
        updateBreakStatus();
        removeEmployeeFromBreakList(badgeId);
    } else if (!employeeBreaks[badgeId]) {
        // Employee starting break
        employeeBreaks[badgeId] = {
            startTime: currentTime,
            onBreak: true,
            returned: false
        };
        employeesOnBreak++;

        document.getElementById("message").textContent = `Employee ${badgeId} is now on break.`;

        // Add to the employeesOnBreak collection
        addEmployeeToBreakCollection(badgeId, currentTime);

        // Update UI
        updateBreakStatus();
        addEmployeeToBreakList(badgeId, currentTime);
    }
    // Clear input field
    document.getElementById("employee-id").value = '';
    document.getElementById("employee-id").focus();  // Focus back to the input field
    updateChart();
}

function updateBreakStatus() {
    document.getElementById("on-break-count").textContent = employeesOnBreak;
    document.getElementById("returned-count").textContent = employeesReturned;
    updateChart();
}

function addEmployeeToBreakList(badgeId, startTime) {
    const tableBody = document.getElementById("on-break-list");

    const row = document.createElement("tr");
    const idCell = document.createElement("td");
    const timeCell = document.createElement("td");

    idCell.textContent = badgeId;
    timeCell.textContent = startTime.toLocaleTimeString();

    row.appendChild(idCell);
    row.appendChild(timeCell);
    row.setAttribute("id", `break-${badgeId}`);

    tableBody.appendChild(row);
    updateChart();
}

function removeEmployeeFromBreakList(badgeId) {
    const row = document.getElementById(`break-${badgeId}`);
    if (row) {
        row.remove();
    }
    updateChart();
}

function addToBreakHistory(badgeId, breakStart, breakEnd, breakDuration) {
    // Collapse all expanded rows before adding a new one
    $(".child-row").hide();
    $(".toggle-button").text("+");

    const tableBody = document.getElementById("break-history-list");
    let existingRow = document.querySelector(`#break-history-list tr[data-employee-id="${badgeId}"]`);

    if (existingRow) {
        // Create a child row
        const childRow = document.createElement("tr");
        childRow.classList.add("child-row");

        const emptyCell = document.createElement("td");
        const startCell = document.createElement("td");
        const endCell = document.createElement("td");
        const durationCell = document.createElement("td");

        startCell.textContent = breakStart.toLocaleTimeString();
        endCell.textContent = breakEnd.toLocaleTimeString();
        durationCell.textContent = breakDuration;

        childRow.appendChild(emptyCell); // Empty cell for indentation
        childRow.appendChild(startCell);
        childRow.appendChild(endCell);
        childRow.appendChild(durationCell);

        existingRow.parentNode.insertBefore(childRow, existingRow.nextSibling);

        // Highlight the row if the break duration is within the allowed limit + 5 minutes
        if (breakDuration <= allowedBreakDuration + 5) {
            childRow.classList.add("highlight");
            setTimeout(() => {
                childRow.classList.remove("highlight");
            }, 3000); // Remove the class after the animation duration
        }
    } else {
        // Create a new row
        const row = document.createElement("tr");
        row.setAttribute("data-employee-id", badgeId);
        row.classList.add("parent-row");

        const idCell = document.createElement("td");
        const startCell = document.createElement("td");
        const endCell = document.createElement("td");
        const durationCell = document.createElement("td");
        const toggleCell = document.createElement("td");

        idCell.textContent = badgeId;
        startCell.textContent = breakStart.toLocaleTimeString();
        endCell.textContent = breakEnd.toLocaleTimeString();
        durationCell.textContent = breakDuration;

        const toggleButton = document.createElement("button");
        toggleButton.textContent = "+";
        toggleButton.classList.add("toggle-button");
        toggleCell.appendChild(toggleButton);

        row.appendChild(idCell);
        row.appendChild(startCell);
        row.appendChild(endCell);
        row.appendChild(durationCell);
        row.appendChild(toggleCell);

        tableBody.appendChild(row);

        // Highlight the row if the break duration is within the allowed limit + 5 minutes
        if (breakDuration <= allowedBreakDuration + 5) {
            row.classList.add("highlight");
            setTimeout(() => {
                row.classList.remove("highlight");
            }, 3000); // Remove the class after the animation duration
        }
    }

    // Sort rows by break end time in descending order
    sortBreakHistory();
    updateChart();
}

function sortBreakHistory() {
    const tableBody = document.getElementById("break-history-list");
    const rows = Array.from(tableBody.querySelectorAll("tr.parent-row, tr.child-row"));

    rows.sort((a, b) => {
        const aEndTime = new Date(a.querySelector("td:nth-child(3)").textContent);
        const bEndTime = new Date(b.querySelector("td:nth-child(3)").textContent);
        return bEndTime - aEndTime;
    });

    rows.forEach(row => tableBody.appendChild(row));
    updateChart();
}

// jQuery for collapse/expand functionality
$(document).on("click", ".toggle-button", function() {
    const button = $(this);
    const parentRow = button.closest("tr");
    const badgeId = parentRow.data("employee-id");

    parentRow.nextUntil(`tr[data-employee-id]`).toggle();

    button.text(button.text() === "+" ? "-" : "+");
});

function addToExceededList(badgeId, totalBreakTime) {
    const tableBody = document.getElementById("exceeded-list");

    const row = document.createElement("tr");
    const idCell = document.createElement("td");
    const timeCell = document.createElement("td");

    idCell.textContent = badgeId;
    timeCell.textContent = totalBreakTime;

    row.appendChild(idCell);
    row.appendChild(timeCell);

    tableBody.appendChild(row);
    updateChart();
}

function updateChart() {
    const ctx = document.getElementById('break-chart').getContext('2d');
    const data = {
        labels: ['On Break', 'Returned', 'Exceeded Break Time'],
        datasets: [{
            data: [employeesOnBreak, employeesReturned, document.getElementById("exceeded-list").children.length],
            backgroundColor: ['#4a90e2', '#50b347', '#ff5c5c'],
        }]
    };
    
    const config = {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${tooltipItem.label}: ${tooltipItem.raw}`;
                        }
                    }
                }
            }
        }
    };

    if (window.breakChart) {
        window.breakChart.destroy();
    }
    window.breakChart = new Chart(ctx, config);
}

function updateBreakHistoryUI(breakRecords) {
    const tableBody = document.getElementById("break-history-list");
    tableBody.innerHTML = ''; // Clear the existing history

    breakRecords.forEach(record => {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        const startCell = document.createElement("td");
        const endCell = document.createElement("td");
        const durationCell = document.createElement("td");

        idCell.textContent = record.badgeId;
        startCell.textContent = new Date(record.breakStart).toLocaleTimeString();
        endCell.textContent = new Date(record.breakEnd).toLocaleTimeString();
        durationCell.textContent = record.breakDuration;

        row.appendChild(idCell);
        row.appendChild(startCell);
        row.appendChild(endCell);
        row.appendChild(durationCell);

        tableBody.appendChild(row);
    });
}

// Add the employee to the "employeesOnBreak" collection when they start their break
async function addEmployeeToBreakCollection(badgeId, breakStart) {
    const breakData = {
        badgeId: badgeId,
        breakStart: breakStart.toISOString()
    };

    await setDoc(doc(database, "employeesOnBreak", badgeId), breakData)
        .then(() => {
            console.log(`Employee ${badgeId} added to employeesOnBreak collection.`);
        })
        .catch((error) => {
            console.error("Error adding employee to employeesOnBreak collection:", error);
        });
}

// Remove the employee from the "employeesOnBreak" collection when they end their break
async function removeEmployeeFromBreakCollection(badgeId) {
    await deleteDoc(doc(database, "employeesOnBreak", badgeId))
        .then(() => {
            console.log(`Employee ${badgeId} removed from employeesOnBreak collection.`);
        })
        .catch((error) => {
            console.error("Error removing employee from employeesOnBreak collection:", error);
        });
}


// Function to synchronize employees currently on break from Firestore
function syncEmployeesOnBreak() {
    const employeesOnBreakRef = collection(database, "employeesOnBreak");

    onSnapshot(employeesOnBreakRef, (snapshot) => {
        const employeesOnBreak = snapshot.docs.map(doc => doc.data());
        // Update UI with the current employees on break
        updateEmployeesOnBreakUI(employeesOnBreak);
    });
}

// Fetch and display existing employees on break
async function fetchExistingEmployeesOnBreak() {
    const employeesOnBreakRef = collection(database, "employeesOnBreak");
    const snapshot = await getDocs(employeesOnBreakRef);
    const employeesOnBreak = snapshot.docs.map(doc => doc.data());
    updateEmployeesOnBreakUI(employeesOnBreak);
}

// Call the functions to sync and fetch existing employees on break
syncEmployeesOnBreak();
fetchExistingEmployeesOnBreak();

// Update the UI for employees on break
function updateEmployeesOnBreakUI(employeesOnBreak) {
    const tableBody = document.getElementById("on-break-list"); // Adjust this to your actual table ID
    tableBody.innerHTML = ''; // Clear existing entries

    employeesOnBreak.forEach(employee => {
        const row = document.createElement("tr");
        const idCell = document.createElement("td");
        const timeCell = document.createElement("td");

        idCell.textContent = employee.badgeId;
        timeCell.textContent = new Date(employee.breakStart).toLocaleTimeString();

        row.appendChild(idCell);
        row.appendChild(timeCell);
        tableBody.appendChild(row);
    });
}



// Call this function whenever the data updates
updateChart();