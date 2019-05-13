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

App.Views.NetworkSettings = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
<div class="content">\
<h1>Network Settings</h1>\
<div>\
<h4>Connected to</h4>\
<div class="signal"></div>\
<input name="ssid" value="<%- ssid %>" disabled></input>\
</div>\
<div class="auto-connect">\
<div class="gecko-cbx">\
<input type="checkbox" value="None" id="auto-connect" name="auto-connect" <%= (auto_join) ? "checked" : ""%> />\
<label for="auto-connect"></label>\
</div>\
<h4>Automatically connect to network</h4>\
</div>\
<div class="btn-bar">\
<button class="btn btn-lg btn-ip dhcp col-50 <%= (dhcp) ? "active pressed": "" %>">DHCP</button>\
<button class="btn btn-lg btn-ip static col-50 <%= (!dhcp) ? "active pressed": "" %>">Static</button>\
</div>\
<div class="settings"></div>\
<button class="btn btn-lg save col-100">Save</button>\
<div class="clear"></div>\
</div>'),
  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose', 'onButton', 'showLoader', 'hideLoader', 'onSave');
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
    'click button.btn-ip:not(.active)': 'onButton',
    'click button.save': 'onSave'
  },

  render: function(){
    var self = this;
    this.views = [];

    if(this.controller.get('view') !== 'network-settings'){
      $(this.el).removeClass('active');
      return;
    }

    self.controller.loading(true);

    //draw empty
    this.$el.html(this.template(this.device.toJSON())).addClass('active');

    // Before device is setup, we don't know which network interface it's using,
    // so we try to get information for both wlan and ethernet. Keeping the property
    // names short in order to minify better. w_ for wlan, e_ for ethernet.
    var cmds = [
      {property: 'w_ssid', cmd: 'get',         args: {args: 'wl s'},   ret: false },
      {property: 'w_rssi', cmd: 'rssi',                                ret: false },
      {property: 'w_dhcp', cmd: 'get',         args: {args: 'wl d e'}, ret: false },
      {property: 'w_auto_join', cmd: 'get',    args: {args: 'wl o e'}, ret: false },
      {property: 'e_dhcp', cmd: 'get',         args: {args: 'et d e'}, ret: false },
      {property: 'e_auto_join', cmd: 'get',    args: {args: 'et a e'}, ret: false }
    ];

    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err) {
        if(err){
          //handle err
        }

        // The device init functions are most likely complete.
        var interface = self.device.get('interface');

        if (interface === 'wlan') {
          var wlan_auto_join = Boolean(Number(self.device.get('w_auto_join')));
          var wlan_dhcp = Boolean(Number(self.device.get('w_dhcp')));
          var wlan_ssid = self.device.get('w_ssid');
          self.device.set({ssid: wlan_ssid, auto_join: wlan_auto_join, dhcp: wlan_dhcp});

          // Only display rssi on wlan connections.
          self.views.push(new App.Views.Signal({
            el: $(self.el).find('.signal'),
            rssi: self.device.get('w_rssi')
          }));
        } else {
          var ethernet_auto_join = Boolean(Number(self.device.get('e_auto_join')));
          var ethernet_dhcp = Boolean(Number(self.device.get('e_dhcp')));
          self.device.set({ssid: interface, auto_join: ethernet_auto_join, dhcp: ethernet_dhcp});
        }

        //check still active view
        if(self.controller.get('view') !== 'network-settings'){
          $(self.el).removeClass('active');
          return;
        }
        self.$el.html(self.template(self.device.toJSON())).addClass('active');

        self.settings = new App.Views.NetworkSettingsView({
          el: $(self.el).find('.settings'),
          controller: self.controller,
          device: self.device,
          parent: self
        });
      });
  },

  showLoader: function() {
    this.loader.$el.show();
  },

  hideLoader: function() {
    this.loader.$el.hide();
  },

  onButton: function(e){
    var self = this;

    $(this.el).find('button.active').removeClass('active pressed');

    $(e.currentTarget).addClass('active pressed');

    self.device.set({dhcp: _.contains($(e.currentTarget)[0].classList, 'dhcp')});

    self.settings.render();
  },

  onSave: function() {
    var self = this;

    self.controller.loading(true);

    var cmds = [];

    var auto_join = $(this.el).find('input[name="auto-connect"]').is(':checked') ? '1' : '0';
    var interface = self.device.get('interface');

    if (self.device.get('dhcp')) {
      if (interface === 'wlan') {
        cmds = [
          {cmd: 'set', args: {args: 'wl d e 1'}},
          {cmd: 'set', args: {args: 'wl o e ' + auto_join}},
          {cmd:'save'}
        ];
      } else {
        cmds = [
          {cmd: 'set', args: {args: 'et d e 1'}},
          {cmd: 'set', args: {args: 'et a e ' + auto_join}},
          {cmd:'save'}
        ];
      }
    } else {

      var ip      = $(this.el).find('input[name="ip"]').val();
      var gateway = $(this.el).find('input[name="gateway"]').val();
      var dns     = $(this.el).find('input[name="dns"]').val();
      var netmask = $(this.el).find('input[name="netmask"]').val();

      if (interface === 'wlan') {
        cmds = [
          {cmd: 'set', args: {args: 'wl d e 0'}},
          {cmd: 'set', args: {args: 'wl o e ' + auto_join}},
          {cmd: 'set', args: {args: 'wl t i ' + ip}},
          {cmd: 'set', args: {args: 'wl t g ' + gateway}},
          {cmd: 'set', args: {args: 'wl t d ' + dns}},
          {cmd: 'set', args: {args: 'wl t n ' + netmask}},
          {cmd:'save'}
        ];
      } else {
        cmds = [
          {cmd: 'set', args: {args: 'et d e 0'}},
          {cmd: 'set', args: {args: 'et a e ' + auto_join}},
          {cmd: 'set', args: {args: 'et s i ' + ip}},
          {cmd: 'set', args: {args: 'et s g ' + gateway}},
          {cmd: 'set', args: {args: 'et s d ' + dns}},
          {cmd: 'set', args: {args: 'et s n ' + netmask}},
          {cmd:'save'}
        ];
      }

    }

    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err) {
        self.controller.loading(false);

        if(err){
          //handle err
        }
      });
  }
});



App.Views.NetworkSettingsView = Backbone.View.extend({
  template: _.template('\
<div>\
<h4>IP Address</h4>\
<input name="ip" value="<%- ip %>" disabled></input>\
</div>\
<div>\
<h4>Gateway</h4>\
<input name="gateway" value="<%- gateway %>" disabled></input>\
</div>\
<div class="static">\
<h4>DNS</h4>\
<input name="dns" value="<%- dns %>" disabled></input>\
</div>\
<div>\
<h4>Netmask</h4>\
<input name="netmask" value="<%- netmask %>" disabled></input>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();

    this.controller = opts.controller;
    this.device = opts.device;
    this.parent = opts.parent;

    this.render();
  },

  onClose: function(){
    this.stopListening();
  },

  events: {},

  render: function() {
    var self = this;

    var cmds;

    if (this.device.get('interface') === 'wlan') {
      if(this.device.get('dhcp')){
        cmds = [
          {property: 'netmask', cmd: 'get', args: {args: 'wl n n'}, ret: false },
          {property: 'ip',      cmd: 'get', args: {args: 'wl n i'}, ret: false },
          {property: 'gateway', cmd: 'get', args: {args: 'wl n g'}, ret: false }
        ];
      } else {
        cmds = [
          {property: 'netmask', cmd: 'get', args: {args: 'wl t n'}, ret: false },
          {property: 'ip',      cmd: 'get', args: {args: 'wl t i'}, ret: false },
          {property: 'gateway', cmd: 'get', args: {args: 'wl t g'}, ret: false },
          {property: 'dns',     cmd: 'get', args: {args: 'wl t d'}, ret: false }
        ];
      }
    } else {
      if(this.device.get('dhcp')){
        cmds = [
          {property: 'netmask', cmd: 'get', args: {args: 'et n n'}, ret: false },
          {property: 'ip',      cmd: 'get', args: {args: 'et n i'}, ret: false },
          {property: 'gateway', cmd: 'get', args: {args: 'et n g'}, ret: false }
        ];
      } else {
        cmds = [
          {property: 'netmask', cmd: 'get', args: {args: 'et s n'}, ret: false },
          {property: 'ip',      cmd: 'get', args: {args: 'et s i'}, ret: false },
          {property: 'gateway', cmd: 'get', args: {args: 'et s g'}, ret: false },
          {property: 'dns',     cmd: 'get', args: {args: 'et s d'}, ret: false }
        ];
      }
    }



    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function() {
        self.controller.loading(false);

        self.$el.html(self.template(self.device.toJSON()));

        if(!self.device.get('dhcp')){
          $(self.el).find('div.static').show();
          $(self.el).find('input').removeAttr('disabled');
        }

      });
  }
});
