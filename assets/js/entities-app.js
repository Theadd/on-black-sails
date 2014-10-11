/**
 * Created by Theadd on 11/10/2014.
 */

var LinkedEntityIndexPage = {

  updateLinkedEntity: function(id, message) {
    var prop = message.data.property;
    if (prop == 'ready') {
      LinkedEntityIndexPage.updateLinkedEntityState(id, message)
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

    if (Boolean(value)) {
      $element.addClass('list-group-item-success');
      $runElement.addClass('disabled');
      $killElement.removeClass('disabled');
    } else {
      $element.removeClass('list-group-item-success');
      $runElement.removeClass('disabled');
      $killElement.addClass('disabled');
    }
  }

};
