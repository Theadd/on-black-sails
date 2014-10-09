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

  };

  App.init();

});
