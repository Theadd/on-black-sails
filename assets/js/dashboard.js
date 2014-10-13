/**
 * globals
 */
var MOBILE_VIEW = 992;

$(function() {
  'use strict';

  function getWidth() {
    return window.innerWidth;
  }

  var App = {
    /**
     * init
     */
    init: function() {
      this.toggleState = true
      this.cacheElements();
      this.bindEvents();
      this.checkViewport();
      this.handleSwitches();
      $('.selectpicker').selectpicker();
      /*$('[title]').tooltip({container: 'body', title: 'hello'});

      $('.selectpicker').change(function() {
        var $button = $(this).data('selectpicker').$button;

        $button
          .tooltip('hide')
          .attr('data-original-title', $button.attr('title'))
          .tooltip('show');
      });*/
    },

    /**
     * cache elements
     */
    cacheElements: function() {
      this.$viewport    = $(window);
      this.$pageWrapper = $("#page-wrapper");
      this.$toggleBtn   = $("#toggle-sidebar");
    },

    /**
     * bind events to elements
     */
    bindEvents: function() {
      this.$viewport.on('resize', this.viewportResize.bind(this));
      this.$toggleBtn.on('click', this.toggleSidebar.bind(this));
    },

    /**
     * trigger checkviewport on resize
     */
    viewportResize: function() {
      this.checkViewport();
    },

    /**
     * toggles sidebar
     */
    toggleSidebar: function(e) {
      this.$pageWrapper.toggleClass('active');

      this.toggleState = this.$pageWrapper.hasClass("active");
    },

    /**
     * Checks the viewport and toggles sidebar if toggled
     */
    checkViewport: function() {
      if (getWidth() >= MOBILE_VIEW) {
        if (this.toggleState === undefined) {
          this.$pageWrapper.addClass("active");
        } else {
          if(this.toggleState == true) {
            this.$pageWrapper.addClass("active");
          } else {
            this.$pageWrapper.removeClass("active");
          }
        }
      } else {
        this.$pageWrapper.removeClass("active");
      }
    },

    handleSwitches: function() {
      //$('.btn-toggle').unbind( "click" );
      $('.btn-toggle').click(function(ev) {
        $(this).find('.btn').toggleClass('active');

        if ($(this).find('.btn-primary').size()>0) {
          $(this).find('.btn').toggleClass('btn-primary');
        }
        if ($(this).find('.btn-danger').size()>0) {
          $(this).find('.btn').toggleClass('btn-danger');
        }
        if ($(this).find('.btn-success').size()>0) {
          $(this).find('.btn').toggleClass('btn-success');
        }
        if ($(this).find('.btn-info').size()>0) {
          $(this).find('.btn').toggleClass('btn-info');
        }

        if ($(this).find('input[type="radio"]').size() > 0) {
          ev.preventDefault();
          ev.stopPropagation();
          $(this).find('.btn').each(function() {
            var active = $(this).hasClass("active");
            var $checkbox = $(this).find('input[type="radio"]').first();
            $checkbox.prop("checked", active);
          });
        }

        $(this).find('.btn').toggleClass('btn-default');
      });
    }

  };

  App.init();

});

