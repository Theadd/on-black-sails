
jQuery(document).ready(function () {

  jQuery(".plastic-list").on("click", ".item > .body > *:not(.no-action)", function () {
    var parent = $(this).parent();

    var item = parent.closest('.item');
    var expansion = parent.siblings('.expansion');

    if (item.hasClass('open')) {
      expansion.slideToggle("slow");
      item.removeClass('open');
    } else {
      expansion.slideToggle("slow").css('display', 'inline-block');
      item.addClass('open');
    }
  });

});
