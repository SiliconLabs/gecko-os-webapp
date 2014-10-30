/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Loader = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
<div class="loading-circle loading-row1 loading-col1"></div>\
<div class="loading-circle loading-row1 loading-col2 up"></div>\
<div class="loading-circle loading-row2 loading-col2"></div>\
<div class="loading-circle loading-row2 loading-col3 up"></div>\
<div class="loading-circle loading-row3 loading-col1"></div>\
<div class="loading-circle loading-row3 loading-col2 down"></div>\
<div class="loading-circle loading-row4 loading-col1 down"></div>'),
  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();
    this.render();
  },
  onClose: function(){
    this.stopListening();
  },
  events: {},
  render: function(){
    $('.loader').removeClass('initial');
    this.$el.html(this.template());
  },
});
