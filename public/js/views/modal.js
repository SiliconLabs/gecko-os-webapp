/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Modal = Backbone.View.extend({
  template: _.template('\
<div class="modal-background <%= systemModal ? "system-modal" : "" %>"></div>\
<div class="modal <%= systemModal ? "system-modal" : "" %>">\
<div class="content">\
<%= content %>\
</div>\
</div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose', 'removeModal', 'isSystemModal');
    this.delegateEvents();

    this.content = opts.content;
    this.controller = opts.controller;
    this.systemModal = opts.systemModal;

    this.render();
  },

  events: {
    'click .modal-background:not(.system-modal)': 'removeModal'
  },

  onClose: function() {
    this.stopListening();
  },

  render: function() {
    var self = this;

    this.$el.html(this.template({
      content: self.content,
      systemModal: self.systemModal
    }));

    this.$el.fadeIn(125);
  },

  removeModal: function() {
    this.controller.closeModal();
  },

  isSystemModal: function() {
    return this.systemModal;
  }
});
