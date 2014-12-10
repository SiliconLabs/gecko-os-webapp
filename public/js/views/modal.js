/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Modal = Backbone.View.extend({
  template: _.template('\
<div class="modal">\
<div class="content">\
<%= content %>\
</div>\
</div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();

    this.content = opts.content;

    this.render();
  },

  onClose: function() {
    this.stopListening();
  },

  render: function() {
    var self = this;

    this.$el.html(this.template({
      content: self.content
    }));
  }
});
