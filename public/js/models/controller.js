/*global $:true, Backbone:true, _:true, App:true, async:true */
/*jshint browser:true */
/*jshint strict:false */

/*
  * Gecko OS Web App, Gecko OS JS API Library & Gecko OS JS Build System
  *
  * Copyright (C) 2019, Silicon Labs
  * All Rights Reserved.
  *
  * The Gecko OS Web App, Gecko OS JavaScript API and Gecko OS JS build system are
  * provided by Silicon Labs. The combined source code, and all derivatives, are licensed
  * by Silicon Labs SOLELY for use with devices manufactured by Silicon Labs, or hardware
  * authorized by Silicon Labs.
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

App.Models.Controller = Backbone.Model.extend({
  views: {},
  defaults: {
    ready: false,
    loading: true,
    size: null,
    width: null,
    height: null,
    view: '',
    nav: true,
    key: null,
    queue: 0,
    retries: 3
  },
  ls: null,
  initialize: function() {
    var self = this;

    _.bindAll(this, 'resize', 'onClose', 'onKey', 'loading', 'modal', 'closeModal');

    var resizer = _.debounce(this.resize, 100);
    $(window).on('resize', resizer);
    $(window).on('orientationchange', this.resize);
    $(window).on('keyup', this.onKey);

    if(typeof (Storage) !== 'undefined'){
      this.ls = localStorage;
    }

    $(document).ajaxError(function(event, jqxhr, settings, exception ) {
      if(jqxhr.status === 401) {
        self.modal({content: 'Operation not allowed'});
      }
    });

    this.cmds = [];

    this.resize();
  },

  onClose: function(){
    $(window).off('keyup', this.onKey);
  },

  onKey: function(e) {
    if (e.keyCode === 27) {
      if(this.views.modal && !this.views.modal.isSystemModal()) {
        this.closeModal();
      }
    }
  },

  resize: function(e){

    //ignore mobile keyboards triggering resize
    if(_.contains(['TEXTAREA','INPUT'], document.activeElement.tagName) && _.contains(['small', 'medium'], this.size)){
      return;
    }

    var d = document;

    var width = $(window).width();
    var height = Math.max(
      Math.max(d.body.scrollHeight, d.documentElement.scrollHeight),
      Math.max(d.body.offsetHeight, d.documentElement.offsetHeight),
      Math.max(d.body.clientHeight, d.documentElement.clientHeight)
    );

    var size;

    if(width > 1280){
      size = 'extra';
    } else if(width > 768){
      size = 'large';
    } else if (width > 480){
      size = 'medium';
    } else {
      size = 'small';
    }

    if(_.contains(['large', 'extra'], size)) {
      $('.nav').show();
    } else {
      $('.main')
        .find('>div:not(.loader, .system-modal)')
          .removeAttr('style');
      if(!App.menu) {
        $('.nav').hide();
      }
    }

    $('body')
      .removeClass('small medium large extra')
      .addClass(size);

    this.set({
      width: width,
      height: height,
      size: size
    });

  },

  loading: function(loading) {
    this.set({loading: loading});

    if(this.get('loading')){
      $('.loader').show();
    } else {
      $('.loader').hide();
    }
  },

  modal: function(args) {
    var self = this;

    var addModal = function(next) {
      if(!args || !args.content){
        return next();
      }

      self.views.modal = new App.Views.Modal({
        el: $('<div id="system-modal" class="system-modal" />')
              .appendTo($('.main')),
        args: args,
        controller: self
      });
      next();
    };

    async.series([self.closeModal, addModal], function(err){});

  },

  closeModal: function(next) {
    var self = this;

    if(!self.views.modal){
        return next();
      }

      $(self.views.modal.el).fadeOut(125, function(){
        self.views.modal.remove();
        if(typeof next === 'function') {
          next();
        }
      });
  }
});
