// #################################### HTML EL. REFERENCES #############################

const minLabel = document.getElementById("min");
const minutesLabel = document.getElementById("minutes");
const secLabel = document.getElementById("sec");
const msLabel = document.getElementById("ms");

const toggleButton = document.getElementById("startbtn");
const saveButton = document.getElementById("savebtn");
const resetButton = document.getElementById("resetbtn");

const setNameInput = document.getElementById("setNameInput");
const setSelect = document.getElementById("setSelect");
const deleteSetButton = document.getElementById("deleteSetButton");

const avgTimeLabel = document.getElementById("avg-time");
const avgTimeLabels = {
  session: document.getElementById("avgSession"),
  day: document.getElementById("avgDay"),
  week: document.getElementById("avgWeek"),
  month: document.getElementById("avgMonth"),
  year: document.getElementById("avgYear"),
  allTime: document.getElementById("avgAllTime"),
};

const timeCountLabel = document.getElementById("time-count");

const $historyTable = $("#history-table");
const historyTableBody = document.querySelector("#history-table tbody");

//  ################################## VARIABLES ####################################

const DEFAULT_SET_NAME = "default";

// Global app var to internally index time records in history
var timeID = 0;

// Key for timeHistory (to save to and read data for table and chart)
var currentSet = DEFAULT_SET_NAME;

// Timer variables
var startTime;
var elapsedTime = 0;
var timerInterval;
var started = false;
var shownMinutes = false;

// In-memory database to store saved times
const timeHistory = new Map();
timeHistory.set("default", {});

// ######################################## INIT ###########################################

// ##################### Bootstrap-Table ######################

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

// Table init with additional options (others in template)
$historyTable.bootstrapTable({
  headerStyle: (column) => {
    return {
      classes: "fs-6",
    };
  },
  exportOptions: {
    fileName: () => {
      const now = new Date();
      const month = now.getMonth().toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const shortDate = `${now.getFullYear()}${month}${day}_${hours}${minutes}`;
      return `${currentSet}_${shortDate}`;
    },
  },
});

// ################### ECharts ####################

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

// ################## OTHER ###################

// Bootstrap event listeners to rerender table and chart when switching tabs (it bugged)
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

initFromLocalStorage();

// ######################################## FUNCTIONS ######################################

// Get history of measured times from localStorage
function initFromLocalStorage() {
  const timeHistorySaved = JSON.parse(localStorage.getItem("timeHistory"));
  // Backwards compatibility for older format
  if (timeHistorySaved) {
    for (var record of Object.values(timeHistorySaved)) {
      // Even older format
      if (typeof record.date === "string") {
        try {
          record.date = dateStrToMs(record.date);
        } catch {
          continue;
        }
      }
      appendHistoryRow(record.date, record.ms);
    }
    updateChart();
  } else {
    const timeHistorySaved = new Map(JSON.parse(localStorage.getItem("times")));

    if (timeHistorySaved)
      for (const [setName, times] of timeHistorySaved.entries()) {
        if (!timeHistory.has(setName)) {
          appendOption(setSelect, setName);
          timeHistory.set(setName, {});
        }
        changeSet(setName, false);

        for (record of Object.values(times)) {
          appendHistoryRow(record.date, record.ms, false);
        }
      }
  }

  // Set current set to last used by user
  changeSet(localStorage.getItem("currentSet"), false);
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

// Bound to Save button
function save() {
  const date = Date.now();

  appendHistoryRow(date, elapsedTime, true, true);
  updateChart();
  updateAvg();
  updateTimeCount();
  saveTimeHistory();
}

// Removes time from current history using button in datatable
function removeHistoryRow(id) {
  delete getCurTimeHistory()[id];
  $historyTable.bootstrapTable("removeByUniqueId", id);
  updateChart();
  updateAvg();
  updateTimeCount();
  saveTimeHistory();
}

// ################## SET MANIPULATION #################

// Bound to form onsubmit
function createSet() {
  const setName = setNameInput.value;
  setNameInput.value = "";
  if (!isSetNameValid(setName) || timeHistory.has(setName)) {
    alert(
      "Set name must be unique and only contain alphanumeric characters and underscores."
    );
    return false;
  }

  timeHistory.set(setName, {});
  saveTimeHistory();

  appendOption(setSelect, setName);

  changeSet(setName);

  return false;
}

// Bound to select
function changeSet(setName = DEFAULT_SET_NAME, saveToLocalStorage = true) {
  if (setName === null) {
    setName = DEFAULT_SET_NAME;
  }

  if (!timeHistory.has(setName)) {
    alert(`Error! Set '${setName}' does not exist.`);
    return;
  }

  currentSet = setName;
  if (saveToLocalStorage) {
    localStorage.setItem("currentSet", currentSet);
  }

  selectOption(setSelect, setName);

  if (setName === DEFAULT_SET_NAME) {
    deleteSetButton.disabled = true;
  } else {
    deleteSetButton.disabled = false;
  }

  updateTable();
  updateChart();
  updateAvg();
  updateTimeCount();
}

// Called after confirmation in modal
function deleteCurSet() {
  timeHistory.delete(currentSet);
  saveTimeHistory();

  removeOption(setSelect, currentSet);

  const lastSet = [...timeHistory.keys()].pop();
  changeSet(lastSet);
}

// ###################### TEMPLATE UPDATES ########################

function updateTable() {
  const rows = [];

  for ([id, record] of Object.entries(getCurTimeHistory())) {
    rows.push({
      id: id,
      date: record.date,
      time: record.ms,
      remove: "",
    });
  }

  $historyTable.bootstrapTable("load", rows);
}

function updateChart() {
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

  timesChart.setOption({
    dataset: {
      source: Object.values(getCurTimeHistory()).map((rec) => {
        return [rec.date, rec.ms];
      }),
    },
  });
}

function formatAvg(avg) {
  return isNaN(avg) ? "⁠—" : msToTimeStr(avg, true);
}

function updateAvg() {
  const times = Object.values(getCurTimeHistory());

  const now = Date.now();

  const timesSession = times.filter((item) => item.session || false);
  const sessionCount = timesSession.length;
  const sessionSum = sumTimes(timesSession);
  avgTimeLabels.session.innerText = formatAvg(sessionSum / sessionCount);

  const timesDay = times.filter((item) => item.date >= now - MS_DAY);
  const dayCount = timesDay.length;
  const daySum = sumTimes(timesDay);
  avgTimeLabels.day.innerText = formatAvg(daySum / dayCount);

  const timesWeek = times.filter((item) => item.date >= now - MS_WEEK);
  const weekCount = timesWeek.length;
  const weekSum = sumTimes(timesWeek);
  avgTimeLabels.week.innerText = formatAvg(weekSum / weekCount);

  const timesMonth = times.filter((item) => item.date >= now - MS_MONTH);
  const monthCount = timesMonth.length;
  const monthSum = sumTimes(timesMonth);
  avgTimeLabels.month.innerText = formatAvg(monthSum / monthCount);

  const timesYear = times.filter((item) => item.date >= now - MS_YEAR);
  const yearCount = timesYear.length;
  const yearSum = sumTimes(timesYear);
  avgTimeLabels.year.innerText = formatAvg(yearSum / yearCount);

  const allTimeCount = times.length;
  const allTimeSum = sumTimes(times);
  avgTimeLabels.allTime.innerText = formatAvg(allTimeSum / allTimeCount);
}

function updateTimeCount() {
  const count = Object.keys(getCurTimeHistory()).length;

  if (count == 1) {
    timeCountLabel.textContent = "1 record";
  } else {
    timeCountLabel.textContent = `${count} records`;
  }
}

// ################## UTILS IN CONTEXT ################

// Function that needs to be used to add new time entries to maintain unique timeID
function appendHistoryRow(
  date,
  timeMs,
  insertToTable = true,
  markSession = false
) {
  const curHistory = getCurTimeHistory();
  curHistory[timeID] = {
    date: date,
    ms: timeMs,
  };

  if (markSession){
    curHistory[timeID].session = true
  }

  if (insertToTable) {
    $historyTable.bootstrapTable("insertRow", {
      index: 0,
      row: {
        id: timeID,
        date: date,
        time: timeMs,
        remove: "",
      },
    });
  }

  timeID++;
}

// Serializes timeHistory to localStorage
function saveTimeHistory() {
  localStorage.setItem(
    "times",
    JSON.stringify(Array.from(timeHistory.entries()))
  );
}

// Returns Object in form {timeID: {date: number, ms:number}} of current set
function getCurTimeHistory() {
  return timeHistory.get(currentSet);
}
