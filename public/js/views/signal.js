/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Signal = Backbone.View.extend({
  template: _.template('\
<div class="bar <%= (strength < 1) ? "empty" : "" %> "></div>\
<div class="bar <%= (strength < 2) ? "empty" : "" %> "></div>\
<div class="bar <%= (strength < 3) ? "empty" : "" %> "></div>\
<div class="bar <%= (strength < 4) ? "empty" : "" %> "></div>\
<div class="rssi"><%- rssi %>dBm</div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose', 'setStrength');
    this.delegateEvents();

    this.rssi = opts.rssi;

    if(this.rssi > -40) {
      this.strength = 4;
    } else if (this.rssi > -55) {
      this.strength = 3;
    } else if (this.rssi > -70) {
      this.strength = 2;
    } else {
      this.strength = 1;
    }

    this.render();
  },

  onClose: function() {
    this.stopListening();
  },

  setStrength: function (strength) {
    this.strength = strength;
    this.render();
  },

  render: function() {
    this.$el.html(this.template({
      strength: this.strength,
      rssi: this.rssi
    }));
  }
});
