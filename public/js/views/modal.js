/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

/*
  * Zentri Web App, Zentri JS API Library & Zentri JS Build System
  *
  * Copyright (C) 2016, Zentri
  * All Rights Reserved.
  *
  * The Zentri Web App, Zentri JavaScript API and Zentri JS build system
  * are provided by Zentri. The combined source code, and all derivatives, are licensed
  * by Zentri SOLELY for use with devices manufactured by Zentri, or hardware
  * authorized by Zentri.
  *
  * THIS SOFTWARE IS PROVIDED BY THE AUTHOR 'AS IS' AND ANY EXPRESS OR IMPLIED
  * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
  * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
  * SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
  * OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
  * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
  * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
  * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
  * OF SUCH DAMAGE.
*/

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
