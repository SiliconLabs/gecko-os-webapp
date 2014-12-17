/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Modal = Backbone.View.extend({
  template: _.template('\
<div class="modal-background"></div>\
<div class="modal">\
<div class="content">\
<%= content %>\
</div>\
</div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();

    this.content = opts.content;
    this.controller = opts.controller;

    this.render();
  },

  events: {
    'click .modal-background': 'removeModal'
  },

  onClose: function() {
    this.stopListening();
  },

  render: function() {
    var self = this;

    this.$el.html(this.template({
      content: self.content
    }));

    this.$el.fadeIn(125);
  },

  removeModal: function() {
    this.controller.closeModal();
  }
});
