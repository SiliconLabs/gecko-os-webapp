/*global Backbone:true, $:true, _:true, async:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.NetworkSettings = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
<div class="content">\
<h1>Network Settings</h1>\
<div>\
<h4>Network Name (SSID)</h4>\
<div class="signal"></div>\
<input name="ssid" value="<%- ssid %>" disabled></input>\
</div>\
<div class="auto-connect">\
<div class="wiconnect-cbx">\
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

    if(this.controller.get('view') !== 'network'){
      $(this.el).removeClass('active');
      return;
    }

    self.controller.loading(true);

    //draw empty
    this.$el.html(this.template(this.device.toJSON())).addClass('active');

    var cmds = [
      {property: 'ssid', cmd: 'get', args: {args: 'wl s'}, ret: false },
      {property: 'rssi', cmd: 'rssi', ret: false },
      {property: 'dhcp', cmd: 'get', args: {args: 'ne d e'}, ret: false },
      {property: 'auto_join', cmd: 'get', args: {args: 'wl o e'}, ret: false }
    ];

    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err) {
        if(err){
          //handle err
        }

        var auto_join = Boolean(Number(self.device.get('auto_join')));
        var dhcp = Boolean(Number(self.device.get('dhcp')));

        self.device.set({auto_join: auto_join, dhcp: dhcp});

        //check still active view
        if(self.controller.get('view') !== 'network'){
          $(self.el).removeClass('active');
          return;
        }
        self.$el.html(self.template(self.device.toJSON())).addClass('active');

        self.views.push(new App.Views.Signal({
          el: $(self.el).find('.signal'),
          rssi: self.device.get('rssi')
        }));

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

    if(self.device.get('dhcp')){
      cmds = [
        {cmd:{flags:0, command:'set ne d e 1'}},
        {cmd:{flags:0, command:'set wl o e ' + auto_join}},
        {cmd:{flags:0, command:'save'}}
      ];
    } else {

      var ip      = $(this.el).find('input[name="ip"]').val();
      var gateway = $(this.el).find('input[name="gateway"]').val();
      var dns     = $(this.el).find('input[name="dns"]').val();
      var netmask = $(this.el).find('input[name="netmask"]').val();

      cmds = [
        {cmd:{flags:0, command:'set ne d e 0'}},
        {cmd:{flags:0, command:'set wl o e ' + auto_join}},
        {cmd:{flags:0, command:'set st i ' + ip}},
        {cmd:{flags:0, command:'set st g ' + gateway}},
        {cmd:{flags:0, command:'set st d ' + dns}},
        {cmd:{flags:0, command:'set st n ' + netmask}},
        {cmd:{flags:0, command:'save'}}
      ];
    }

    async.eachSeries(
      cmds,
      self.device.postCommand,
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

    if(this.device.get('dhcp')){
      cmds = [
        {property: 'netmask', cmd: 'get', args: {args: 'ne n'}, ret: false },
        {property: 'ip', cmd: 'get', args: {args: 'ne i'}, ret: false },
        {property: 'gateway', cmd: 'get', args: {args: 'ne g'}, ret: false }
      ];
    } else {
      cmds = [
        {property: 'netmask', cmd: 'get', args: {args: 'st n'}, ret: false },
        {property: 'ip', cmd: 'get', args: {args: 'st i'}, ret: false },
        {property: 'gateway', cmd: 'get', args: {args: 'st g'}, ret: false },
        {property: 'dns', cmd: 'get', args: {args: 'st d'}, ret: false }
      ];
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
