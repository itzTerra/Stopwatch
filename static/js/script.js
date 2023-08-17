const minLabel = document.getElementById("min");
const minutesLabel = document.getElementById("minutes");
const secLabel = document.getElementById("sec");
const msLabel = document.getElementById("ms");

const toggleButton = document.getElementById("startbtn");
const saveButton = document.getElementById("savebtn");
const resetButton = document.getElementById("resetbtn");

const avgTimeLabel = document.getElementById("avg-time");
const timeCountLabel = document.getElementById("time-count");

const $historyTable = $("#history-table");
const historyTableBody = document.querySelector("#history-table tbody");

// HTML to render inside remove column of data table
const removeButtonHTML =
  '<button type="button" class="btn-close" aria-label="Close"></button>';

// Formatter to render the removeButton HTML inside remove column
function removeFormatter(value, row, index) {
  return removeButtonHTML;
}

// Weird Bootstrap-Table cell event binding
window.operateEvents = {
  "click .btn-close": (e, value, row, index) => {
    removeHistoryRow(row.id);
  },
};

// Bootstrap table init
$historyTable.bootstrapTable({
  headerStyle: (column) => {
    return {
      classes: "fs-6",
    };
  },
});

// Chart init
const timesChart = echarts.init(document.getElementById("timesChart"), "dark");
// Options are in utils.js
timesChart.setOption(timesChartOption);
// Make it reactive
$(window).on("resize", function () {
  if (timesChart != null && timesChart != undefined) {
    timesChart.resize();
  }
});

// Bootstrap event listeners to rerender table and chart when switching tabs (it bugged out)
var refreshTable = false;
const tableTabBtn = document.querySelector(
  "button[data-bs-target='#history-tab-pane']"
);
tableTabBtn?.addEventListener("shown.bs.tab", (e) => {
  if (refreshTable) {
    $historyTable.bootstrapTable("resetView");
    refreshTable = false;
  }
});
const chartTabBtn = document.querySelector(
  "button[data-bs-target='#chart-tab-pane']"
);
chartTabBtn?.addEventListener("shown.bs.tab", (e) => {
  if (timesChart != null && timesChart != undefined) {
    timesChart.resize();
    refreshTable = true;
  }
});

// window.onbeforeunload += () => {
//     saveTimeHistory()
// }

// Global app var to internally index time records in history
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

// In-memory database to store saved times
var timeHistory = {};

// Get history of measured times from localStorage
const timeHistorySaved = JSON.parse(localStorage.getItem("timeHistory"));
if (timeHistorySaved !== null) {
  for (var rec of Object.values(timeHistorySaved)) {
    if (typeof rec.date === "string") {
      try {
        const dateParts = rec.date.split("/");
        const year = parseInt(dateParts[2]);
        const month = parseInt(dateParts[1]) - 1; // Months in JavaScript are 0-indexed
        const day = parseInt(dateParts[0]);
        rec.date = new Date(year, month, day).getTime();
      } catch {
        continue;
      }
    }
    appendHistoryRow(rec.date, rec.ms);
  }

  updateChart();
}

// Tied to Start/Stop button
function startStop() {
  if (!started) {
    // Start timer
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(updateTimer, 10);
    toggleButton.textContent = "Stop";
    saveButton.disabled = true;
  } else {
    // Stop timer
    clearInterval(timerInterval);
    toggleButton.textContent = "Start";
    saveButton.disabled = false;
  }
  started = !started;
}

// Tied to Reset button
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

// Tied to Save button
function save() {
  appendHistoryRow(Date.now(), elapsedTime);
  updateChart();
  saveTimeHistory();
}

// Interval function after Start is pressed
function updateTimer() {
  var currentTime = Date.now();
  elapsedTime = currentTime - startTime;
  var time = new Date(elapsedTime);
  var minutes = time.getUTCMinutes().toString();
  var seconds = time.getUTCSeconds().toString();
  var milliseconds = Math.floor(time.getUTCMilliseconds() / 10)
    .toString()
    .padStart(2, "0");

  if (!shownMinutes && minutes > 0) {
    minutesLabel.style.display = "inline";
    shownMinutes = true;
  }

  minLabel.textContent = minutes > 0 ? minutes : "";
  secLabel.textContent = minutes > 0 ? seconds.padStart(2, "0") : seconds;
  msLabel.textContent = milliseconds;
}

function appendHistoryRow(date, timeMs) {
  var dateStr = new Date(date).toLocaleDateString("en-gb");
  var timeStr = msToTimeStr(timeMs);

  timeHistory[timeID] = {
    date: date,
    ms: timeMs,
  };

  $historyTable.bootstrapTable("insertRow", {
    index: 0,
    row: {
      id: timeID++,
      date: dateStr,
      time: timeStr,
      timeMS: timeMs,
      remove: "",
    },
  });

  // chartData.push([date, timeMs]);

  //   if (chartData.length == 0) {
  //     chartData.push([date, timeMs]);
  //   } else {
  //     if (chartData.length == 1) {
  //       chartData.push([date, timeMs]);

  //       // Calculate trend coefficients
  //       const coefficients = calculateLinearTrend(chartData);
  //         // const coefficients = calculatePolynomialTrend(chartData);

  //       chartData[0].push(evaluateLinear(coefficients, chartData[0][0]));
  //       chartData[1].push(evaluateLinear(coefficients, chartData[1][0]));
  //     } else {
  //       const dataWithoutTrend = chartData.map((item) => {
  //         return [item[0], item[1]];
  //       });

  //       // Calculate trend coefficients
  //       const coefficients = calculateLinearTrend(dataWithoutTrend);
  //         // const coefficients = calculatePolynomialTrend(dataWithoutTrend);
  //       console.log(dataWithoutTrend, coefficients);

  //       let trendValue = evaluateLinear(coefficients, date);
  //         // let trendValue = evaluatePolynomial(coefficients, date);

  //       chartData.push([date, timeMs, trendValue]);
  //     }
  //   }

  updateAvg(timeMs);
  updateTimeCount();
}

function removeHistoryRow(id) {
  delete timeHistory[removeID];
  saveTimeHistory();
  $historyTable.bootstrapTable("removeByUniqueId", removeID);
  updateChart();
  updateAvg(-row.timeMS);
  updateTimeCount();
}

function updateChart() {
  timesChart.setOption({
    dataset: {
      source: Object.values(timeHistory).map((rec) => {
        return [rec.date, rec.ms]
      }),
    },
  });
}

function updateAvg(value) {
  timeSum += value;
  if (value > 0) {
    timeCount++;
  } else if (value < 0) {
    timeCount--;
  }

  if (timeCount == 0) {
    avgTimeLabel.textContent = "0";
    return;
  }
  let average = timeSum / timeCount;

  let minutes = Math.floor(average / 60 / 1000)
    .toString()
    .padStart(2, "0");
  let seconds = Math.floor((average % (60 * 1000)) / 1000)
    .toString()
    .padStart(2, "0");
  let milliseconds = Math.floor((average % 1000) / 10)
    .toString()
    .padStart(2, "0");

  avgTimeLabel.textContent = minutes + ":" + seconds + ":" + milliseconds;
}

function updateTimeCount() {
  timeCountLabel.textContent = timeCount;
}

function saveTimeHistory() {
  localStorage.setItem("timeHistory", JSON.stringify(timeHistory));
}
