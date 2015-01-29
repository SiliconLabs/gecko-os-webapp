/*global Backbone:true, $:true, _:true, App:true, async:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */


App.Views.Firmware = Backbone.View.extend({
  els: [],
  views: [],

  template: _.template('\
<div class="content">\
<h1>Firmware Management</h1>\
<div>\
<p>The firmware and files on this module can be updated and configured using an online Firmware Management Service. ACKme modules are factory configured with access to the standard WiConnect firmware from the ACKme OTA update server.</p>\
<p>If you require access to custom firmware services which may include access to custom firmware images, files or firmware bundles, please contact ACKme to setup an account and obtain custom firmware credentials. After receiving registration credentials, register this module in the registration area below.</p>\
<div class="clear"></div>\
</div>\
<hr>\
</div>\
<div class="content"><h1>Firmware Update</h1>\
<div>\
<div class="col-60">\
<h4>Device Management host</h4>\
<input name="ota_host" class="ota_host" value="<%- ota_host %>">\
</div>\
<div class="col-40">\
<h4>port</h4>\
<input name="ota_port" class="ota_port" value="<%- ota_port %>">\
</div>\
<div>\
<h4>Firmware Bundle</h4>\
<input type="text" placeholder="Latest Version" name="bundle" class="bundle" value="">\
</div>\
<div class="right">\
<h5>force update</h5>\
<div class="wiconnect-cbx secondary small">\
<input type="checkbox" value="force" id="force" name="force" />\
<label for="force"></label>\
</div>\
</div>\
<button class="btn btn-lg active right upgrade">Upgrade</button><div class="clear">\
</div>\
</div>\
<hr>\
</div>\
<div class="content">\
<h1>Custom Firmware Activation</h1>\
<div>\
<p>Activate this module for custom firmware and files by entering your Activation ID and Password obtained from ACKme.</p>\
<div>\
<h4>Activate ID</h4>\
<input type="text" id="activation_id" name="activation_id" class="activation_id" value="">\
</div>\
<div>\
<h4>Password</h4>\
<input type="password" id="activation_password" name="activation_password" class="activation_password" value="">\
</div>\
<div class="right">\
<h5>show password</h5>\
<div class="wiconnect-cbx secondary small">\
<input type="checkbox" value="show-password" id="show-password" name="show-password" />\
<label for="show-password"></label>\
</div>\
</div>\
<button class="btn btn-lg active activate">Activate</button>\
<div class="clear"></div>\
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

    //draw empty
    this.$el.html(this.template(this.device.toJSON())).addClass('active');

    var cmds = [
      {property: 'ota_host', cmd: 'get', args: {args: 'ot h'}, ret: false},
      {property: 'ota_port', cmd: 'get', args: {args: 'ot p'}, ret: false}
    ];

    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err) {

        //check still active view
        if(self.controller.get('view') !== 'firmware'){
          $(self.el).removeClass('active');
          return;
        }
        self.$el.html(self.template(self.device.toJSON())).addClass('active');

        self.controller.loading(false);

      });
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

    var ota_host = $(this.el).find('input[name="ota_host"]').val();
    var ota_port = $(this.el).find('input[name="ota_port"]').val();

    if(ota_host !== self.device.get('ota_host').replace('\r\n', '')) { //ota host changed
      cmds.push({cmd: 'set', args: {flags: 0, args:'ot h ' + ota_host}});
    }

    if(ota_port !== self.device.get('ota_port').replace('\r\n', '')) { //ota port changed
      cmds.push({cmd: 'set', args: {flags: 0, args:'ot p ' + ota_port}});
    }

    if(cmds.length > 0) { //something to save
      cmds.push({cmd: 'save'});
    }

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

    self.device.wiconnect.ota(
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
