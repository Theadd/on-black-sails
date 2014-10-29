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

$(".dashboard-agreement-action").on("click", function (ev) {
  ev.preventDefault();
/*<a class="btn dashboard-agreement-action pull-right<%= (action.enabled) ? '' : ' disabled' %>"
 data-action="<%= action.key %>" data-id="<%= agreement.id %>" href="#"
 title="<%= action.help %>"><%- action.display %></a>*/
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

