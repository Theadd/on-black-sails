/**
 * Created by Theadd on 11/10/2014.
 */

function bindGUIEvents() {

  $(".list-group-item .label").on("click", function (ev) {
    ev.preventDefault();
    var target = $(this).data("target"),
      id = $(this).data("id"),
      action = $(this).data("action"),
      prop = $(this).data("prop"),
      url = '/'+target+'/' + action + '/'+id;

    if (!$(this).hasClass('disabled')) {
      if (action == 'detail') {
        document.location.href = url;
      } else {
        $.getJSON(url, {
          prop: prop
        }).done(function (data) {
        });
      }
    }
  });

  $(".list-group-item-toggle-next").on("click", function (ev) {
    ev.preventDefault();

    $(this).next().slideToggle("slow");

  });

  $(".dashboard-agreement-list").on("click", "a.dashboard-agreement-action", function (ev) {
    ev.preventDefault();

    if (!$(this).hasClass("disabled")) {
      var action = $(this).data("action"),
        id = $(this).data("id"),
        url = "/agreement/action/";

      $.getJSON(url, {
        id: id,
        action: action
      }).done(function (data) {
        console.log("in callback of getJSON of agreement-action click:");
        console.log(data);
      });
    }
  });

  $(".dashboard-chart-level").on("click", "a", function (ev) {
    ev.preventDefault();

    var level = $(this).data('level'),
      list = $(this).closest(".dashboard-chart-level"),
      widget = $(this).closest(".chart-wrapper"),
      container = widget.find(".chart-container");

    list.find(".active").removeClass("active");
    $(this).parent().addClass("active");
    container.data('level', '' + level);

    loadChart(container);
  });

  $("#linkedentity-detail-stats-refresh").on("click", function (ev) {
    ev.preventDefault();

    var linkedEntityStatsContainer = $(".linkedentity-detail-panel");
    if (linkedEntityStatsContainer.length) {
      linkedEntityStatsContainer.html('<h4 class="loading-content"><i class="fa fa-spinner fa-spin"></i> Requesting information...</h4>');
      linkedEntityRequestStats(linkedEntityStatsContainer);
    }
  });
}


function linkedEntityRequestStats(container) {
  var id = container.data('id'),
    url = "/linkedentity/stats/";

  $.getJSON(url, {
    id: id
  }).done(function (data) {});

}