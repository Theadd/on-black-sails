/**
 * Created by Theadd on 11/10/2014.
 */

$(".list-group-item .label").on("click", function (ev) {
  ev.preventDefault();
  var target = $(this).data("target"),
    id = $(this).data("id"),
    action = $(this).data("action"),
    prop = $(this).data("prop"),
    url = '/'+target+'/' + action + '/'+id;

  $.getJSON(url, {
    prop: prop
  }).done(function (data) {});
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

