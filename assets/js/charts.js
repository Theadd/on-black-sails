
/*$(function () {
  $(document).ready(function () {
    var chartContainer = $("#chart-container");
    if (chartContainer.length) {
      console.log("displaying chart");
      loadChart(chartContainer);
    }
  });
});*/

var loadChart = function ($container) {
  /*Highcharts.setOptions({
    global: {
      useUTC: false
    }
  });*/

  var agreement = parseInt($container.data('agreement')),
    filter = $container.data('filter'),
    incoming = Boolean(JSON.parse($container.data('incoming') || false)),
    level = parseInt($container.data('level')),
    url = "/agreement/history/";

  $.getJSON(url, {
    agreement: agreement,
    filter: filter,
    incoming: incoming,
    level: level
  }).done(function (data) {
    console.log("in callback of getJSON: ");
    var series;

    if (incoming) {
      /*"info" : {
        "count" : 3077,
          "deadmarked" : 0,
          "error" : 0,
          "updated" : 0,
          "uptodate" : 3075,
          "created" : 0,
          "deadnotcreated" : 2
      }*/
      series = generateSeries(data.data, [{
        type: 'areaspline',
        name: 'COUNT',
        key: 'count'
      },{
        type: 'areaspline',
        name: 'UPDATED',
        key: 'updated'
      },{
        type: 'areaspline',
        name: 'UPTODATE',
        key: 'uptodate'
      },{
        type: 'areaspline',
        name: 'DEADNOTCREATED',
        key: 'deadnotcreated'
      }]);
    } else {
      series = generateSeries(data.data, [{
        type: 'areaspline',
        name: 'COUNT',
        key: 'count'
      },{
        type: 'areaspline',
        name: 'SENT',
        key: 'sent'
      },{
        type: 'areaspline',
        name: 'ERROR',
        key: 'error'
      }]);
    }

    renderChart($container, series);

  });



}

function generateSeries(data, series) {
  var i, e, _series = [];

  for (i in series) {
    _series.push($.extend({}, {type: 'areaspline', name: 'Default', key: 'default', data: []}, series[i]));
  }





  for (i in data) {
    var d = new Date(data[i].date);

    for (e in _series) {
      _series[e].data.unshift({x: d, y: data[i].info[_series[e].key] || 0});
    }
  }

  return _series;
}

function renderChart(container, series) {

  container.highcharts({
    chart: {
      zoomType: 'x'
    },
    title: {
      text: null  //'USD to EUR exchange rate from 2006 through 2008'
    },
    subtitle: {
      text: document.ontouchstart === undefined ?
        'Click and drag in the plot area to zoom in' :
        'Pinch the chart to zoom in'
    },
    xAxis: {
      type: 'datetime',
      minRange: 4 * 3600000
    },
    yAxis: {
      title: {
        text: null
      },
      min: 0
    },
    legend: {
      floating: true,
      align: 'left',
      verticalAlign: 'top',
      y: 5,
      x: 20
    },
    plotOptions: {
      areaspline: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
          stops: [
            [0, Highcharts.getOptions().colors[0]],
            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
          ]
        },
        marker: {
          radius: 2
        },
        lineWidth: 1,
        states: {
          hover: {
            lineWidth: 2
          }
        },
        threshold: null
      }
    },

    series: series
  });
}

function loadVisibleCharts() {
  console.log("loading visible charts...");
  var chartContainers = $(".chart-container");
  if (chartContainers.length) {
    chartContainers.each( function () {
      if (!($(this).data('loaded') || false)) {
        if ($(this).is(':visible')) {
          console.log("LOADING (NOT LOADED) VISIBLE CHART!!");
          $(this).data('loaded', true);
          loadChart($(this));
        } else {
          console.log("NOT LOADING (NOT LOADED) INVISIBLE CHART!!");
        }
      } else {
        console.log("NOT LOADING ALREADY LOADED CHART!!");
      }

    });
  }
}