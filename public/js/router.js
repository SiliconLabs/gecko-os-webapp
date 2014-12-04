/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Router = Backbone.Router.extend ({
  routes: {
    "": "connect",
    // "quick-start": "quickstart",
    // "network-settings": "network",
    // "system": "system",
    // "console": "terminal",
    // "*default": "quickstart"
  },

  connect: function() {
    App.controller.set({
      view: 'connect'
    });
  },

  network: function() {
    App.controller.set({
      view: 'network'
    });
  },

  system: function() {
    App.controller.set({
      view: 'system'
    });
  },

  terminal: function() {
    App.controller.set({
      view: 'console'
    });
  },

  browser: function() {
    App.controller.set({
      view: 'browser'
    });
  },

  gohackme: function() {
    App.controller.set({
      view: 'gohackme'
    });
  }

});
