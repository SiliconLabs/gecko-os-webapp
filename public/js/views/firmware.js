/*global Backbone:true, $:true, _:true, App:true, async:true */
/*jshint multistr:true */
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

App.Views.Firmware = Backbone.View.extend({
  els: [],
  views: [],

  template: _.template('\
<div class="content">\
<h1>Firmware Management</h1>\
<div>\
<p>The applications, resources and Gecko OS running on this device can be wirelessly updated using the Zentri Device Management Service.</p>\
<p>Custom applications can also be developed using the Gecko OS Software Development Kit.</p>\
<p>For more information and to gain access to development tools, visit the <a href="https://zentri.com/developers">Zentri developer page</a>.</p>\
</div>\
<hr>\
</div>\
<div class="content">\
<h1>Firmware Update</h1>\
<div>\
<div>\
<h4>Bundle Version</h4>\
<input type="text" placeholder="Latest" name="bundle" class="bundle" value="">\
</div>\
<div class="right">\
<h5>force update</h5>\
<div class="gecko-cbx secondary small">\
<input type="checkbox" value="force" id="force" name="force" />\
<label for="force"></label>\
</div>\
</div>\
<button class="btn btn-lg active right upgrade">Update</button><div class="clear">\
</div>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose', 'onUpgrade', 'onOTA', 'onActivate', 'onPassword');

    this.delegateEvents();

    this.controller = opts.controller;
    this.device = opts.device;

    this.listenTo(this.controller, 'change:view', this.render);
    this.render();
  },

  onClose: function(){
    this.stopListening();
  },

  events: {
    'change #show-password': 'onPassword',
    'click .upgrade': 'onUpgrade',
    'click .activate': 'onActivate'
  },

  render: function(){
    var self = this;

    if(this.controller.get('view') !== 'firmware'){
      $(this.el).removeClass('active');
      return;
    }

    self.controller.loading(true);

    this.$el.html(this.template(this.device.toJSON())).addClass('active');
    self.controller.loading(false);
  },

  onPassword: function(e) {
    if($(this.el).find('#show-password').is(':checked')) {
      $(this.el).find('input[name="activation_password"]').attr('type', 'text');
      return;
    }
    $(this.el).find('input[name="activation_password"]').attr('type', 'password');
  },

  onUpgrade: function() {
    var self = this;

    var cmds = [];

    var force = $(this.el).find('input[name="force"]').is(':checked') ? ' -f' : '';
    var bundle = $(this.el).find('input[name="bundle"]').val().trim();

    bundle = (bundle.length > 0) ? ' -b ' + bundle : '';

    cmds.push({cmd: 'ota', args: {flags: 0, args: force + bundle}});

    self.controller.loading(true);

    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err) {

        self.controller.loading(false);

        //ota command issued - enter retry/progress state
        self.controller.modal({systemModal: true, content:'<h2>Firmware Updating</h2><div class="progress-bar"><div class="progress"></div></div>'});
        self.onOTA();
      });
  },

  onOTA: function() {
    var self = this;

    if(typeof self.ota === 'undefined') {
      self.ota = {
        attempt: 0,
        retries: 100
      };
    }

    $.ajax({
        url: self.device.get('host') + '/command/ver',
        type: 'GET',
        contentType: 'application/json',
        timeout: 4000
      })
      .fail(function() {
        if(self.ota.attempt > self.ota.retries){
          return self.controller.modal({content:'<h2>Unable to reconnect to device.</h2>'});
        }

        self.ota.attempt += 1;
        $('.progress').css({width: String((self.ota.attempt / self.ota.retries)*100) + '%'});

        setTimeout(self.onOTA, 1000);
      })
      .done(function() {
        self.ota.attempt = 0;//clear count

        self.controller.modal({content:'<h2>Firmware Update complete.</h2>'});
        // top.location = self.device.get('host');
      });
  },

  onActivate: function() {
    var self = this;

    var cmds = [];

    var activation_id       = $(this.el).find('input[name="activation_id"]').val();
    var activation_password = $(this.el).find('input[name="activation_password"]').val();

    self.controller.loading(true);

    self.device.geckoOS.ota(
      {args: '-a ' + activation_id + ' ' + activation_password },
      function(err, res) {

        self.controller.loading(false);

        if(res.response === 'Command failed\r\n') {
          return self.controller.modal({content: '<h2>Custom Firmware Activation error.</h2><h2>Please check Activation ID and Password and try again.</h2>'});
        }

        $('#activation_id').val('');
        $('#activation_password').val('');

        self.controller.modal({content:'<h2>Custom Firmware Activation complete.</h2>'});
      });
  }
});
