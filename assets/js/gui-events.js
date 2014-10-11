/**
 * Created by Theadd on 11/10/2014.
 */

$(".list-group-item .label").on("click", function (ev) {
  ev.preventDefault()
  var target = $(this).data("target"),
    id = $(this).data("id"),
    action = $(this).data("action"),
    prop = $(this).data("prop"),
    url = '/'+target+'/' + action + '/'+id;

  $.getJSON(url, {
    prop: prop
  }).done(function (data) {});
});

