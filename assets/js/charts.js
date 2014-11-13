
var loadChart = function ($container) {
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
    var series;

    if (incoming) {
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
        name: 'ERROR',
        key: 'error'
      },{
        type: 'areaspline',
        name: 'UP TO DATE',
        key: 'uptodate'
      },{
        type: 'areaspline',
        name: 'CREATED',
        key: 'created'
      },{
        type: 'areaspline',
        name: 'DEAD, NOT CREATED',
        key: 'deadnotcreated'
      },{
        type: 'areaspline',
        name: 'MARKED AS DEAD',
        key: 'deadmarked'
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

  var temp = container.highcharts({
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
    tooltip: {
      shared: true
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
  }).highcharts();

  console.log(temp);
}

function loadVisibleCharts() {
  var chartContainers = $(".chart-container");

  if (chartContainers.length) {
    chartContainers.each( function () {
      if (!($(this).data('loaded') || false)) {
        if ($(this).is(':visible')) {
          $(this).data('loaded', true);
          loadChart($(this));
        }
      }
    });
  }
}