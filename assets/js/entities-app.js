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
