/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Network = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
  <div class="ssid"><%- ssid %></div>\
  <div class="channel">Channel <%- channel %></div>\
  <div class="security"><%- security %></div>\
  <div class="signal"></div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();
    this.network = opts.network;

    this.render();
  },

  onClose: function() {
    this.stopListening();
  },

  render: function() {
    var self = this;

    this.$el.html(this.template(this.network));

    this.views.push(new App.Views.Signal({
      el: $(self.el).find('.signal'),
      rssi: self.network.rssi
    }));
  }
});
