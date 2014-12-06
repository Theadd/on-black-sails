/**
 * Created by Theadd on 11/10/2014.
 */

var LinkedEntityIndexPage = {

  updateLinkedEntity: function(id, message) {
    var prop = message.data.property;
    if (prop == 'ready') {
      LinkedEntityIndexPage.updateLinkedEntityState(id, message)
    } else if (prop == 'stats') {
      LinkedEntityIndexPage.updateLinkedEntityDetail(id, message)
    } else {
      LinkedEntityIndexPage.updateLinkedEntityLabel(id, message)
    }
  },

  updateLinkedEntityLabel: function(id, message) {
    var prop = message.data.property, value = message.data.value;
    var $element = $('.label[data-id="' + id + '"][data-prop="' + prop + '"]').first();

    if (Boolean(value)) {
      $element.addClass('label-primary').removeClass('label-default');
    } else {
      $element.addClass('label-default').removeClass('label-primary');
    }
  },

  updateLinkedEntityState: function(id, message) {
    var prop = message.data.property, value = message.data.value,
      $element = $('a.list-group-item[data-id="' + id + '"]').first(),
      $runElement = $('.label[data-id="' + id + '"][data-prop="run"]').first(),
      $killElement = $('.label[data-id="' + id + '"][data-prop="kill"]').first();

    if ($element.length) {
      if (Boolean(value)) {
        $element.addClass('list-group-item-success');
        $runElement.addClass('disabled');
        $killElement.removeClass('disabled');
      } else {
        $element.removeClass('list-group-item-success');
        $runElement.removeClass('disabled');
        $killElement.addClass('disabled');
      }
    } else {
      $element = $('.dashboard-agreement-processes .item[data-id="' + id + '"] .dashboard-agreement-process-ready');
      if ($element.length) {
        var $parent = $element.parent();
        if (Boolean(value)) {
          $parent.addClass('box-success');
          $parent.removeClass('box-danger');
          $element.html('ON');
        } else {
          $parent.removeClass('box-success');
          $parent.addClass('box-danger');
          $element.html('OFF');
        }
      }
    }
  },

  addLinkedEntity: function(id, message) {
    location.reload();
  }

};

var LinkedEntityDetailPage = {

  updateLinkedEntity: function (id, message) {
    var prop = message.data.property;
    if (prop == 'stats') {
      LinkedEntityDetailPage.updateLinkedEntityDetail(id, message)
    }
  },

  updateLinkedEntityDetail: function (id, message) {
    var value = message.data.value,
      container = $(".linkedentity-detail-panel");

    if (container.length && container.data('id') == id) {
      var parsed = LinkedEntityDetailPage.parseDetailValue(value);

      for (var i in parsed) {
        if (typeof parsed[i] === "object" && parsed[i].role) {
          parsed[i].listHTML = LinkedEntityDetailPage.getContent(parsed[i]);
        }
      }

      var obj = {
        stats: parsed,
        logs: {},
        elogs: {}
      };

      console.log(JSON.stringify(parsed, null, '  '));

      $('.linkedentity-detail-panel').html(
        JST['assets/templates/entityDetailPanel.ejs'](obj)
      );

      $.App.renderMarkdownPreview();
      $.App.bindTabEvents();
      $.App.bindGUIEvents();
      $.App.bindTooltips();

    }
  },

  parseDetailValue: function (value) {
    var output = {};

    for (var i in value) {
      if (typeof value[i] === "object") {
        if (Object.keys(value[i]).length) {
          if (typeof value[i]['role'] !== "undefined") {
            if (value[i]['role'] != 'none') {
              output[i] = $.extend({}, value[i]);
            }
          } else {
            output[i] = $.extend({}, value[i]);
          }
        }
      } else {
        output[i] = value[i];
      }
    }

    return output;
  },

  prettify: function (key, value) {
    var output = {display: '', value: ''};

    if (typeof prettyStats[key] !== "undefined") {
      if (typeof prettyStats[key].display !== "undefined") {
        output.display = prettyStats[key].display;
      }
      if (typeof prettyStats[key].value === "function") {
        output.value = prettyStats[key].value(value);
      } else {
        output.value = value;
      }
    } else {
      output.display = key;
      output.value = value;
    }

    return $.extend({}, output);
  },

  getContent: function (input) {
    var content = "<ul class=\"monospace\">\n", pretty;

    for (var i in input) {
      pretty = LinkedEntityDetailPage.prettify(i, input[i]);
      content += '<li><strong>' + pretty.display + '</strong>: ';
      if (typeof pretty.value === "object") {
        content += LinkedEntityDetailPage.getContent(pretty.value);
      } else {
        content += pretty.value;
      }
      content += "</li>\n";
    }

    content += "</ul>\n";
    return content;
  }

};

var prettyStats = {
  pid: {
    display: 'Process ID (PID)'
  },
  rss: {
    display: 'Resident Set Size',
    tooltip: "RSS is the Resident Set Size and is used to show how much memory is allocated to that process and is in \
      RAM. It does not include memory that is swapped out. It does include memory from shared libraries as long as the\
      pages from those libraries are actually in memory. It does include all stack and heap memory.",
    value: function (val) {
      return Helpers.formatBigNumber(val) + 'bytes';
    }
  },
  heapTotal: {
    display: 'Heap (Total)',
    value: function (val) {
      return Helpers.formatBigNumber(val) + 'bytes';
    }
  },
  heapUsed: {
    display: 'Heap (Used)',
    value: function (val) {
      return Helpers.formatBigNumber(val) + 'bytes';
    }
  }
};
