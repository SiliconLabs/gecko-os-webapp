/*global Backbone:true, $:true, _:true, async:true, App:true */
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

App.Views.Connect = Backbone.View.extend({
  els: [],
  views: [],

  template: _.template('\
<div class="content">\
<h1>Connect</h1>\
<button class="btn btn-lg manual">Other...</button>\
<button class="btn btn-lg active scan">Scan</button>\
<div class="wifi-scan wifi-logo">\
<div class="wifi-bar"></div>\
<div class="wifi-bar"></div>\
<div class="wifi-bar"></div>\
<div class="wifi-bar"></div>\
</div>\
<div class="wifi-scan status">Scanning</div>\
<div class="networks"></div>\
<div class="no-results">No networks found.<br>Click Rescan to try again.</div>\
<div class="clear"></div>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose', 'onScan', 'onResults');
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
    'click .scan': 'onScan',
    'click .network': 'onNetwork',
    'click .manual': 'onNetwork'
  },

  onScan: function() {
    var self = this;

    if(this.connectView){
      this.connectView.onClose();
      $(this.el).find('.connect-modal').empty();
    }

    this.$('.manual').addClass('scanning');

    this.$('.scan')
      .text('Scanning...')
      .removeClass('active')
      .addClass('scanning');

    this.networks = [];
    this.$('.networks').empty();
    this.$('.wifi-scan').addClass('scanning');

    var scanComplete = function(err, resp) {
      if(err) {
        return self.controller.modal({
          systemModal: true,
          content:'<h2><div class="error"></div>Error communicating with device.</h2>'
        });
      }
      _.each(resp.response.split('\r\n'), function(line) {
        if(line.length === 0) {
          return;
        }

        line = line.replace(/\s{2,}/g, ' ').split(' ');

        if(line[0] === '!') {
          return;
        }

        if(Number(line[8]) === 0) {
          //hidden ssid
          return;
        }

        var network = {
          id: Number(line[1]),
          channel: Number(line[2]),
          rssi: Number(line[3]),
          bssid: line[4],
          security: line[6],
          ssid: _.rest(line, 9).join(' ')
        };

        self.networks.push(network);
      });

      self.onResults();
    };

    self.device.geckoOS.scan({args: '-v', timeout: 20000}, scanComplete);
  },


  onResults: function() {
    var self = this;

    this.$('.manual').removeClass('scanning');

    $(this.el).find('.scan')
      .text('Rescan')
      .removeClass('scanning')
      .addClass('active');

    $(this.el).find('.wifi-scan').removeClass('scanning');

    if(this.networks.length === 0) {
      $('.no-results').show();
      return;
    }
    $('.no-results').hide();

    var nwks = $(self.el).find('.networks');

    _.chain(self.networks).sortBy(function(n){return -n.rssi;}).uniq(function(n) {return n.ssid;}).map(function(network) {
      self.views.push(new App.Views.Network({
        network: network,
        el: $('<div />')
          .addClass('network')
          .attr('data-network', network.id)
          .appendTo(nwks)
      }));
    }).value();

    nwks.slideDown(125);
  },


  onNetwork: function(e) {
    var self = this;

    if(this.connectView){
      this.connectView.onClose();
    }

    var network = {
      id: -1,
      channel: '',
      rssi: 0,
      bssid: '',
      security: '',
      ssid: ''
    };

    if(!_.contains(e.currentTarget.classList, 'manual')) {
      network = _.findWhere(this.networks, {id: $(e.currentTarget).data('network')});
    }

    this.connectView = new App.Views.QuickConnect({
      device: this.device,
      controller: this.controller,
      network: network,
      el: $('<div />')
        .addClass('connect-modal modal')
        .appendTo(this.$el)
    });

  },


  render: function() {
    var self = this;

    if(this.controller.get('view') !== 'connect'){
      $(this.el).removeClass('active');
      return;
    }
    this.$el.html(this.template()).addClass('active');
    self.controller.loading(false);

    self.onScan();
  }
});



App.Views.QuickConnect = Backbone.View.extend({
  els: [],
  views: [],

  template: _.template('\
<div class="content">\
<h2><%- (ssid.length > 0 ? ssid : "Other network") %></h2>\
<div class="ssid">\
<h4>SSID</h4>\
<input name="ssid" type="text" value="" autocapitalize="off"></input>\
</div>\
<div class="bssid">\
<h4>BSSID</h4>\
<input name="bssid" value="<%- bssid %>" disabled></input>\
</div>\
<div class="security-type btn-bar">\
<h4>Security type</h4>\
<button class="btn btn-lg btn-security btn-security-wpa active pressed">WPA2 / WPA</button>\
<button class="btn btn-lg btn-security btn-security-open">Open</button>\
<button class="btn btn-lg btn-security btn-security-wep">WEP</button>\
</div>\
<div class="wlan-password">\
<h4>Password</h4>\
<input name="password" type="password" value="" autocapitalize="off"></input>\
</div>\
<div class="right show-password">\
<h5>show password</h5>\
<div class="gecko-cbx secondary small">\
<input type="checkbox" value="show-password" id="show-password" name="show-password" />\
<label for="show-password"></label>\
</div>\
</div>\
<div>\
<div class="gecko-cbx">\
<input type="checkbox" value="None" id="show-advanced" name="show-advanced" />\
<label for="show-advanced"></label>\
</div>\
<h4>Advanced Settings</h4>\
</div>\
<div class="advanced">\
<div class="btn-bar">\
<button class="btn btn-lg btn-ip btn-dhcp active pressed col-50">DHCP</button>\
<button class="btn btn-lg btn-ip btn-static col-50">Static</button>\
</div>\
<div class="static">\
<div>\
<h4>IP</h4>\
<input name="ip" class="ipv4" value=""></input>\
</div>\
<div>\
<h4>Gateway</h4>\
<input name="gateway" class="ipv4" value=""></input>\
</div>\
<div>\
<h4>DNS</h4>\
<input name="dns" class="ipv4" value=""></input>\
</div>\
<div>\
<h4>Netmask</h4>\
<input name="netmask" class="ipv4" value=""></input>\
</div>\
</div>\
</div>\
<div>\
<button class="btn btn-lg cancel">Cancel</button>\
<button class="btn btn-lg save">Connect</button>\
</div>\
<div class="clear"></div>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose',
              'onAdvanced', 'onAddressing', 'onPassword', 'onSecurity',
              'onIPv4',
              'onCancel', 'onSave', 'onSetupExit'
              );

    this.delegateEvents();

    this.network = opts.network;
    this.device = opts.device;
    this.controller = opts.controller;

    this.render();
  },

  onClose: function(){
    this.stopListening();
  },

  events: {
    'change #show-advanced': 'onAdvanced',
    'change #show-password': 'onPassword',
    'click .btn-security': 'onSecurity',
    'click .btn-ip': 'onAddressing',
    'blur .ipv4': 'onIPv4',
    'keyup .ipv4.invalid': 'onIPv4',
    'click .cancel': 'onCancel',
    'click .save': 'onSave'
  },


  onCancel: function() {
    $('.connect>.content').show();

    this.remove();
  },


  onIPv4: function(e) {
    var thisAdd = $(e.currentTarget);

    var IPv4 = new RegExp(/((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}/);

    if(!IPv4.test(thisAdd.val())){
      return thisAdd.addClass('invalid');
    }

    thisAdd.removeClass('invalid');
  },


  onPassword: function(e) {
    if($(this.el).find('#show-password').is(':checked')) {
      $(this.el).find('input[name="password"]').attr('type', 'text');
      return;
    }
    $(this.el).find('input[name="password"]').attr('type', 'password');
  },


  onAdvanced: function(e) {
    $(this.el).find('.advanced').slideToggle(125);
  },


  onSecurity: function(e) {
    var thisBtn = $(e.currentTarget);
    this.$('.btn-security.active').removeClass('active pressed');
    thisBtn.addClass('active pressed');

    this.network.security = 'Auto';

    if(thisBtn.hasClass('btn-security-wep')){
      this.network.security = 'WEP';
    }

    if(thisBtn.hasClass('btn-security-open')){
      return this.$('.wlan-password, .show-password').hide();
    }

    this.$('.wlan-password, .show-password').show();
  },


  onAddressing: function(e) {
    var thisBtn = $(e.currentTarget);
    this.$('.btn-ip.active').removeClass('active pressed');
    thisBtn.addClass('active pressed');

    if(!thisBtn.hasClass('btn-static')){
      return this.$('.static').slideUp(125);
    }

    this.$('.static').slideDown(125);
  },


  onSave: function() {
    var self = this;

    var cmds = [];

    if(self.network.ssid.length === 0){
      self.network.ssid = $(this.el).find('input[name="ssid"]').val();
    }

    var advanced = $($(this.el).find('input[name="show-advanced"]')[0]).is(':checked');

    // GOS needs to have " and \ escaped in string to be able to save passwords with " and \ characters.
    var password = $(this.el).find('input[name="password"]').val().replace(/[\\"]/g, "\\$&");
    cmds = [
      {cmd: 'set', args: {args: 'wl c ' + (self.network.security === 'WEP' ? 'WEP' : 'Auto')}},
      {cmd: 'set', args: {args: 'wl s \"' + self.network.ssid + '\"'}},
      {cmd: 'set', args: {args: 'wl p \"' + password + '\"'}}
    ];

    if(advanced){
      var dhcp = _.contains($(this.el).find('button.btn-ip.active')[0].classList, 'btn-dhcp');

      cmds.push({cmd: 'set', args: {args: 'wl d e ' + (dhcp ? 1 : 0)}});

      if(!dhcp){
        var ip      = $(this.el).find('input[name="ip"]').val();
        var gateway = $(this.el).find('input[name="gateway"]').val();
        var dns     = $(this.el).find('input[name="dns"]').val();
        var netmask = $(this.el).find('input[name="netmask"]').val();

        cmds.push({cmd: 'set', args: {args:'wl t i ' + ip}});
        cmds.push({cmd: 'set', args: {args:'wl t g ' + gateway}});
        cmds.push({cmd: 'set', args: {args:'wl t d ' + dns}});
        cmds.push({cmd: 'set', args: {args:'wl t n ' + netmask}});
      }
    }

    cmds.push({cmd: 'save'});

    if(self.device.get('web_setup')) {
      $('.networks').empty(); //clear network list
      cmds.push({cmd:'reboot'});
    } else {
      self.controller.loading(true);
    }

    var credentialFail = function(err, res) {
      return self.controller.modal({
        systemModal: true,
        content:'<h2>Failed to verify network password.</h2>',
        primaryBtn: {
          content: 'Save &amp; Continue',
          clickFn: function(modal) {
            saveSettings();
          }
        },
        secondaryBtn: {
          content: 'Check Password',
          class: 'cancel'
        }
      });
    };

    var saveSettings = function() {
      if(self.device.get('web_setup')){
        self.controller.modal({
          systemModal: true,
          content:'<h2>Saving Network Settings.</h2>'
        });
      } else {
        self.controller.loading(true);
      }

      async.eachSeries(
        cmds,
        self.device.issueCommand,
        function(err) {
          if(self.device.get('web_setup')){
            self.remove();
            return self.onSetupExit();
          }

          if(err){
            //handle err
          }

          self.controller.loading(false);

          $('.connect>.content').show();
          self.remove();
        });
    };

    saveSettings();
  },


  render: function() {
    var self = this;

    var data = this.network;
    var mac = self.device.get('mac');
    data.mac = mac.substring(mac.length - 4).replace(':','').toLowerCase();

    this.$el.html(this.template(data));
    if(_.contains(['medium ', 'small'], this.controller.get('size'))) {
      $('.connect>.content').hide();
    }

    if(!self.device.get('web_setup')) {
      $('.reconnect').hide();
    }

    if(self.network.ssid.length > 0){
      this.$('.ssid').hide();
    } else {
      this.$('.bssid').hide();
    }

    if(self.network.security.length > 0){
      this.$('.security-type').hide();
    }

    if(self.network.security === 'Open'){
      this.$('.wlan-password, .show-password').hide();
    }
  },


  onSetupExit: function() {
    var self = this;

    if(navigator.userAgent.indexOf('Android') >= 0) {
      return self.controller.modal({content:'<h2>Auto-discovery is not supported on Android.</h2><h2>Download the <a href="intent://#Intent;scheme=ackme_discovery;action=android.intent.action.VIEW;package=discovery.ack.me.ackme_discovery;end">ACKme Discovery</a> App from the Play store to find your device.</h2>'});
    }

    return self.controller.modal({content:'<h2>Device is now connecting to ' + this.network.ssid + '.</h2><h2>Setup is complete.</h2>'});

  }
});
