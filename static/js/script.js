const removeButton = '<button type="button" class="btn-close" aria-label="Close"></button>';

const minLabel = document.getElementById("min");
const minutesLabel = document.getElementById("minutes");
const secLabel = document.getElementById("sec");
const msLabel = document.getElementById("ms");

const toggleButton = document.getElementById("startbtn");
const saveButton = document.getElementById("savebtn")
const resetButton = document.getElementById("resetbtn");

const avgTimeLabel = document.getElementById("avg-time");
const timeCountLabel = document.getElementById("time-count");

const $historyTable = $('#history-table');
const historyTableBody = document.querySelector("#history-table tbody");


var timeID = 0;

// Average time variables
var timeCount = 0;
var timeSum = 0;

// Timer variables
var startTime;
var elapsedTime = 0;
var timerInterval;
var started = false;
var shownMinutes = false;

var timeHistory = {}

window.removeEvent = {
    "click .btn-close": (e, value, row, index) => {
        var removeID = row.id;
        delete timeHistory[removeID];
        localStorage.setItem("timeHistory", JSON.stringify(timeHistory));

        $historyTable.bootstrapTable('removeByUniqueId', removeID)
        updateAvg(-row.timeMS);
        updateTimeCount();
    }
}

$historyTable.bootstrapTable();

// Get history of measured times from localStorage
var timeHistorySaved = JSON.parse(localStorage.getItem("timeHistory"));
if (timeHistorySaved !== null){
    for (var rec of Object.values(timeHistorySaved)){
        appendHistoryRow(rec.date, rec.time, rec.ms);
    }
}

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

    appendHistoryRow(curDate, time, elapsedTime);
    saveTimeHistory();
}

function saveTimeHistory(){
    localStorage.setItem("timeHistory", JSON.stringify(timeHistory));
}

function appendHistoryRow(date, time, timeMs){
    timeHistory[timeID] = {
        "date": date, 
        "time": time, 
        "ms": timeMs
    };

    var removeID = timeID++;

    $historyTable.bootstrapTable('insertRow', {index: 0, row: {
        id: removeID,
        date: date,
        time: time,
        timeMS: timeMs,
        remove: ""
    }});

    updateAvg(timeMs);
    updateTimeCount();
}

function updateAvg(value){
    timeSum += value;
    if (value > 0){
        timeCount++
    } else if (value < 0){
        timeCount--
    }

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

function updateTimeCount(){
    timeCountLabel.textContent = timeCount;
}

function removeFormatter(value, row, index){
    return removeButton;
}

// window.onbeforeunload += () => {
//     localStorage.setItem("timeHistory", JSON.stringify(timeHistory));
// }

