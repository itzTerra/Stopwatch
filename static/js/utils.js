// Custom table sorter for date column
function dateSorter(a, b) {
  const [dayA, monthA, yearA] = a.split("/");
  const [dayB, monthB, yearB] = b.split("/");

  const dateA = new Date(`${monthA}/${dayA}/${yearA}`);
  const dateB = new Date(`${monthB}/${dayB}/${yearB}`);

  return dateA - dateB;
}

function msToTimeStr(timeMs, padMinutes = true) {
  const time = new Date(timeMs);
  var minutes = time.getUTCMinutes().toString();
  if (padMinutes) {
    minutes = minutes.padStart(2, "0");
  }
  var seconds = time.getUTCSeconds().toString().padStart(2, "0");
  var milliseconds = Math.floor(time.getUTCMilliseconds() / 10)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}:${milliseconds}`;
}

function timeStrToMs(timeString) {
  const timeParts = timeString.split(":");
  const minutes = parseInt(timeParts[0]);
  const seconds = parseInt(timeParts[1]);
  const milliseconds = parseInt(timeParts[2]);

  const totalMilliseconds = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
  return totalMilliseconds;
}

function dateStrToMs(timeString) {
  const dateParts = timeString.split("/");
  const year = parseInt(dateParts[2]);
  const month = parseInt(dateParts[1]) - 1; // Months in JavaScript are 0-indexed
  const day = parseInt(dateParts[0]);

  return (new Date(year, month, day)).getTime();
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
    left: 15,
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
