/**
 * Created by Theadd on 11/10/2014.
 */

var LinkedEntityIndexPage = {

  updateLinkedEntity: function(id, message) {
    var prop = message.data.property, value = message.data.value;
    var $element = $('.label[data-id="' + id + '"][data-prop="' + prop + '"]').first();

    if (Boolean(value)) {
      $element.addClass('label-primary').removeClass('label-default');
    } else {
      $element.addClass('label-default').removeClass('label-primary');
    }
  }

};
