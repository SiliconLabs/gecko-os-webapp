/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Modal = Backbone.View.extend({
  template: _.template('\
<div class="modal-background <%= systemModal ? "system-modal" : "" %>"></div>\
<div class="modal <%= systemModal ? "system-modal" : "" %>">\
<div class="content">\
<% if(showClose) { %><div class="modal-close"></div><% } %>\
<%= content %>\
<% if(primaryBtn || secondaryBtn) { %>\
<div>\
<% if(secondaryBtn) { %><button class="btn btn-lg modal-secondary <%= secondaryBtn.class %>"><%= secondaryBtn.content || "Back" %></button><% } %>\
<% if(primaryBtn) { %><button class="btn btn-lg modal-primary <%= primaryBtn.class %>"><%= primaryBtn.content || "Next" %></button><% } %>\
</div>\
<% } %>\
</div>\
</div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render',
              'isSystemModal',
              'onPrimary', 'onSecondary',
              'onClose', 'removeModal');

    this.delegateEvents();

    // {
    //   content: 'string',
    //   [systemModal]: boolean|false,
    //   [showClose]: boolean|false,
    //   [primaryBtn]: {
    //       clickFn: function|null
    //       [content]: 'string'|'Next',
    //       [class]: 'string'|'',
    //     }|null,
    //   [secondaryBtn]: {
    //       clickFn: function|null
    //       [content]: 'string'|'Back',
    //       [class]: 'string'|'',
    //     }|null
    // }
    this.args = opts.args;
    this.controller = opts.controller;

    this.render();
  },

  events: {
    'click .modal-background:not(.system-modal)': 'removeModal',
    'click .modal-primary': 'onPrimary',
    'click .modal-secondary': 'onSecondary',
    'click .modal-close':  'onClose'
  },

  onPrimary: function() {
    if(this.args.primaryBtn && this.args.primaryBtn.hasOwnProperty('clickFn') && typeof this.args.primaryBtn.clickFn === 'function') {
      return this.args.primaryBtn.clickFn(this);
    }
    this.onClose();
  },

  onSecondary: function() {
    if(this.args.secondaryBtn && this.args.secondaryBtn.hasOwnProperty('clickFn') && typeof this.args.secondaryBtn.clickFn === 'function') {
      return this.args.secondaryBtn.clickFn(this);
    }
    this.onClose();
  },

  onClose: function() {
    var self = this;
    this.$el.fadeOut(125, function(){
      self.stopListening();
      self.remove();
    });
  },

  render: function() {
    var self = this;

    self.args.systemModal = self.args.systemModal || false;
    self.args.showClose = self.args.showClose || false;
    self.args.primaryBtn = self.args.primaryBtn || null;
    self.args.secondaryBtn = self.args.secondaryBtn || null;

    this.$el.html(this.template(self.args));

    this.$el.fadeIn(125);
  },

  removeModal: function() {
    this.controller.closeModal();
  },

  isSystemModal: function() {
    return this.systemModal;
  }
});
