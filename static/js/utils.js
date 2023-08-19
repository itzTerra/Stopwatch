const MS_DAY = 24 * 3600 * 1000;
const MS_WEEK = 7 * MS_DAY;
const MS_MONTH = 30 * MS_DAY;
const MS_YEAR = 365 * MS_DAY;

function dateFormatter(dateMs) {
  return msToDateStr(dateMs);
}

function timeFormatter(timeMs){
    return msToTimeStr(timeMs, true)
}

function msToTimeStr(timeMs, padMinutes = false) {
  const time = new Date(timeMs);
  let minutes = time.getUTCMinutes().toString();
  if (padMinutes) {
    minutes = minutes.padStart(2, "0");
  }
  let seconds = time.getUTCSeconds().toString().padStart(2, "0");
  let milliseconds = Math.floor(time.getUTCMilliseconds() / 10)
    .toString()
    .padStart(2, "0");

  //   let minutes = Math.floor(average / 60 / 1000)
  //     .toString()
  //     .padStart(2, "0");
  //   let seconds = Math.floor((average % (60 * 1000)) / 1000)
  //     .toString()
  //     .padStart(2, "0");
  //   let milliseconds = Math.floor((average % 1000) / 10)
  //     .toString()
  //     .padStart(2, "0");

  return `${minutes}:${seconds}:${milliseconds}`;
}

function timeStrToMs(timeString) {
  const timeParts = timeString.split(":");
  const minutes = parseInt(timeParts[0]);
  const seconds = parseInt(timeParts[1]);
  const milliseconds = parseInt(timeParts[2]);

  const totalMilliseconds =
    minutes * 60 * 1000 + seconds * 1000 + milliseconds * 10;
  return totalMilliseconds;
}

function msToDateStr(dateMs){
    const date = new Date(dateMs)
    let days = date.getDate().toString().padStart(2, "0")
    let month = (date.getMonth()+1).toString().padStart(2, "0")
    let year = date.getFullYear()
    return `${days}/${month}/${year}`
}

function dateStrToMs(timeString) {
  const dateParts = timeString.split("/");
  const year = parseInt(dateParts[2]);
  const month = parseInt(dateParts[1]) - 1; // Months in JavaScript are 0-indexed
  const day = parseInt(dateParts[0]);

  return new Date(year, month, day).getTime();
}

function sumTimes(times){
    return times.reduce((sum, cur) => sum + cur.ms, 0)
}

function isSetNameValid(setName) {
  // Use a regular expression to match valid characters
  const regex = /^[a-zA-Z0-9_]+$/;

  // Test the input against the regular expression
  return regex.test(setName);
}

function appendOption(select, value, text = null, selected = false) {
  if (text === null) {
    text = value;
  }
  const newOption = document.createElement("option");
  newOption.value = value;
  newOption.textContent = text;
  newOption.selected = selected;
  select.appendChild(newOption);
}

function removeOption(select, value) {
  const optionToRemove = select.querySelector(`option[value="${value}"]`);
  if (optionToRemove) {
    optionToRemove.remove();
  } else {
    console.error(`Option with value ${valueToRemove} not found.`);
  }
}

function selectOption(select, value) {
  const optionToSelect = select.querySelector(`option[value="${value}"]`);
  if (optionToSelect) {
    optionToSelect.selected = true;
  } else {
    console.error(`Option with value ${valueToRemove} not found.`);
  }
}

function calculateLinearTrendOld(data) {
  var sumX = 0;
  var sumY = 0;
  var sumXY = 0;
  var sumX2 = 0;

  for (var i = 0; i < data.length; i++) {
    var x = data[i][0];
    var y = data[i][1];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  var n = data.length;
  var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  var intercept = (sumY - slope * sumX) / n;

  return {
    slope: slope,
    intercept: intercept,
  };
}

function calculateLinearTrend(data) {
  const result = regression.linear(data, { precision: 3 });
  console.log(data, result);
  return result.equation;
}

function calculatePolynomialTrend(data) {
  const result = regression.polynomial(data, { order: 3, precision: 3 });

  console.log(data, result);
  // Get the coefficients of the polynomial equation
  return result.equation;
}

function evaluateLinear(coefficients, x) {
  return coefficients.slope * x + coefficients.intercept;
}

// Function to evaluate a polynomial at a given x value
function evaluatePolynomial(coefficients, x) {
  let result = 0;
  for (let i = 0; i < coefficients.length; i++) {
    result += coefficients[i] * Math.pow(x, i);
  }
  return result;
}

const timesChartOption = {
  grid: {
    top: 40,
    left: 25,
    right: 50,
    bottom: 50,
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "line",
    },
    formatter: function (params) {
      var date = new Date(params[0].value[0]).toLocaleDateString();
      var value = params[0].value[1];
      return `${msToTimeStr(value, false)}<br>${date}`;
    },
    textStyle: {
      color: "#111",
    },
  },
  xAxis: {
    type: "time",
    name: "Date",
    splitLine: {
      show: false,
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: "#999",
      },
    },
    axisLabel: {
      showMinLabel: true,
      showMaxLabel: true,
      formatter: function (value, index) {
        const date = new Date(value);
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        if (index === 0) {
          return `${day}\n${month}\n${year}`;
        } else if (day == 1) {
          if (month == 1) {
            return `${day}\n${month}\n${year}`;
          } else {
            return `${day}\n${month}`;
          }
        } else {
          return day.toString();
        }
      },
      lineHeight: 18,
    },
  },
  yAxis: {
    type: "time",
    name: "Time",
    splitLine: {
      show: true,
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: "#999",
      },
    },
    axisLabel: {
      formatter: "{m}:{ss}",
    },
  },
  dataset: {
    dimensions: ["date", "time", "trend"],
    source: [],
  },
  series: [
    {
      type: "line",
      encode: {
        x: "date",
        y: "time",
      },
    },
    {
      type: "line",
      name: "Trend",
      encode: {
        x: "date",
        y: "trend",
      },
    },
  ],
  dataZoom: [
    {
      type: "slider",
      show: true,
      xAxisIndex: [0],
      filterMode: "empty",
      start: 0,
      end: 100,
      showDataShadow: false,
      backgroundColor: "rgba(47,69,84,0)",
      borderColor: "rgba(47,69,84,0.8)",
      fillerColor: "rgba(167,183,204,0.4)",
      dataBackground: {
        lineStyle: {
          color: "rgba(47,69,84,0.8)",
          width: 1,
        },
        areaStyle: {
          color: "rgba(47,69,84,0.8)",
        },
      },
      handleStyle: {
        color: "rgba(167,183,204,0.8)",
      },
      textStyle: {
        color: "#333",
      },
    },
    {
      type: "inside",
      xAxisIndex: [0],
      filterMode: "empty",
    },
  ],
};
