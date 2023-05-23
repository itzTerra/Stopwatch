const removeButton = '<button type="button" class="btn-close" aria-label="Close"></button>';

const minLabel = document.getElementById("min");
const minutesLabel = document.getElementById("minutes");
const secLabel = document.getElementById("sec");
const msLabel = document.getElementById("ms");

const toggleButton = document.getElementById("startbtn");
const saveButton = document.getElementById("savebtn")
const resetButton = document.getElementById("resetbtn");

const avgTimeLabel = document.getElementById("avg-time");

const historyTableBody = document.querySelector("#history-table tbody");


var timeID = 0;
var timeCount = 0;
var timeSum = 0;


var timeHistory = {}
// Get history of measured times from localStorage
var timeHistorySaved = JSON.parse(localStorage.getItem("timeHistory"));
if (timeHistorySaved !== null){
    for (var rec of Object.values(timeHistorySaved)){
        timeHistory[timeID] = {...rec};

        appendHistoryRow(rec.date, rec.time, rec.ms);
    }
}


var startTime;
var elapsedTime = 0;
var timerInterval;
var started = false;
var shownMinutes = false;


function startStop() {
    if (!started){
        // Start timer
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(updateTimer, 10);
        toggleButton.textContent = "Stop";
        saveButton.disabled = true;
    } else{
        // Stop timer
        clearInterval(timerInterval);
        toggleButton.textContent = "Start";
        saveButton.disabled = false;
    }
    started = !started;  
}

function reset() {
    clearInterval(timerInterval);
    elapsedTime = 0;
    started = false;
    
    minutesLabel.style.display = "none";
    shownMinutes = false;

    minLabel.textContent = "";
    secLabel.textContent = 0;
    msLabel.textContent = "00";

    toggleButton.textContent = "Start";
    saveButton.disabled = true;
}

function updateTimer() {
    var currentTime = Date.now();
    elapsedTime = currentTime - startTime;
    var time = new Date(elapsedTime);
    var minutes = time.getUTCMinutes().toString();
    var seconds = time.getUTCSeconds().toString();
    var milliseconds = Math.floor(time.getUTCMilliseconds() / 10).toString().padStart(2, "0");

    if (!shownMinutes && minutes > 0){
        minutesLabel.style.display = "inline";
        shownMinutes = true;
    }

    minLabel.textContent = minutes > 0 ? minutes : "";
    secLabel.textContent = minutes > 0 ? seconds.padStart(2, "0") : seconds;
    msLabel.textContent = milliseconds;
}

function save(){
    var curDate = new Date().toLocaleDateString("en-gb")
    var time = new Date(elapsedTime);
    var minutes = time.getUTCMinutes().toString().padStart(2, "0");
    var seconds = time.getUTCSeconds().toString().padStart(2, "0");
    var milliseconds = Math.floor(time.getUTCMilliseconds() / 10).toString().padStart(2, "0");
    time = `${minutes}:${seconds}:${milliseconds}`;

    timeHistory[timeID] = {
        "date": curDate, 
        "time": time, 
        "ms": elapsedTime
    };
    localStorage.setItem("timeHistory", JSON.stringify(timeHistory));

    appendHistoryRow(curDate, time, elapsedTime);
}

function appendHistoryRow(date, time, timeMs){    
    var newRow = document.createElement("tr");

    var dateCell = document.createElement("td");
    dateCell.textContent = date;
    newRow.appendChild(dateCell);

    var timeCell = document.createElement("td");
    timeCell.textContent = time;
    newRow.appendChild(timeCell);

    var removeCell = document.createElement("td");
    removeCell.innerHTML = removeButton;
    
    var removeID = timeID++;
    removeCell.querySelector("button").addEventListener("click", function() {
        delete timeHistory[removeID];
        localStorage.setItem("timeHistory", JSON.stringify(timeHistory));

        historyTableBody.removeChild(newRow);
        timeSum -= timeMs;
        timeCount--;
        updateAvg();
    });
    newRow.appendChild(removeCell);

    historyTableBody.appendChild(newRow);
    timeSum += timeMs;
    timeCount++
    updateAvg();
}

function updateAvg(){
    if (timeCount == 0){
        avgTimeLabel.textContent = "0";
        return
    }
    let average = timeSum / timeCount;

    let minutes = Math.floor(average/60/1000).toString().padStart(2, "0");
    let seconds = Math.floor((average % (60 * 1000)) / 1000).toString().padStart(2, "0");
    let milliseconds = Math.floor((average % 1000) / 10).toString().padStart(2, "0");

    avgTimeLabel.textContent = minutes + ":" + seconds + ":" + milliseconds;
}


// window.onbeforeunload += () => {
//     localStorage.setItem("timeHistory", JSON.stringify(timeHistory));
// }

