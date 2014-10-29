/*global Backbone:true, $:true, _:true, async:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.QuickStart = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
<div class="content">\
  <h1>Quick Start</h1>\
  <button class="btn btn-lg active scan">Scan</button>\
  <div class="wifi-scan wifi-logo">\
    <div class="wifi-bar"></div>\
    <div class="wifi-bar"></div>\
    <div class="wifi-bar"></div>\
    <div class="wifi-bar"></div>\
  </div>\
  <div class="wifi-scan status">Scanning</div>\
  <div class="networks"></div>\
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
    'click .network': 'onNetwork'
  },
  onScan: function() {
    var self = this;

    // this.controller.set({queue:this.controller.cmds.push('new')});
    if(this.connectView){
      this.connectView.onClose();
      $(this.el).find('.connect').empty();
    }

    this.$('.scan')
      .text('Scanning...')
      .removeClass('active')
      .addClass('scanning');

    this.networks = [];
    this.$('.networks').empty();
    this.$('.wifi-scan').addClass('scanning');

    this.device.getNetworks(self, self.onResults);
  },
  onResults: function() {
    var self = this;

    $(this.el).find('.scan')
      .text('Rescan')
      .removeClass('scanning')
      .addClass('active');

    $(this.el).find('.wifi-scan').removeClass('scanning');

    var nwks = $(self.el).find('.networks');

    nwks.show();

    _.each(_.sortBy(this.networks, function(n) {return -n.rssi;}), function(network) {
      self.views.push(new App.Views.Network({
        network: network,
        el: $('<div />')
          .addClass('network')
          .attr('data-network', network.id)
          .appendTo(nwks)
      }));
    });
  },
  onNetwork: function(e) {
    var self = this;

    if(this.connectView){
      this.connectView.onClose();
    }

    this.connectView = new App.Views.QuickConnect({
      device: this.device,
      controller: this.controller,
      network: _.findWhere(this.networks, {id: $(e.currentTarget).data('network')}),
      el: $('<div />')
        .addClass('connect')
        .appendTo(this.$el)
    });

  },
  render: function() {
    if(this.controller.get('view') !== 'quickstart'){
      $(this.el).removeClass('active');
      return;
    }

    this.$el.html(this.template()).addClass('active');
  }
});



App.Views.QuickConnect = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
<div class="content">\
  <h2><%- ssid %></h2>\
  <div>\
    <h4>BSSID</h4>\
    <input name="bssid" value="<%- bssid %>" disabled></input>\
  </div>\
  <div>\
    <h4>Passkey</h4>\
    <input name="passkey" type="password" value=""></input>\
  </div>\
  <div>\
    <div class="show-advanced">\
      <input type="checkbox" value="None" id="show-advanced" name="show-advanced" />\
      <label for="show-advanced"></label>\
    </div>\
    <h4>Show Advanced Settings</h4>\
  </div>\
  <div class="advanced">\
    <div>\
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
    _.bindAll(this, 'render', 'onClose', 'onCancel', 'onIPv4', 'onAdvanced', 'onAddressing', 'onSave');
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
    'change input[type=checkbox]': 'onAdvanced',
    'click .btn-ip': 'onAddressing',
    'blur .ipv4': 'onIPv4',
    'keyup .ipv4.invalid': 'onIPv4',
    'click .cancel': 'onCancel',
    'click .save': 'onSave'
  },
  onCancel: function() {
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

  onAdvanced: function(e) {
    $(this.el).find('.advanced').toggle();
  },

  onAddressing: function(e) {
    var thisBtn = $(e.currentTarget);
    $(this.el).find('.btn-ip.active').removeClass('active pressed');
    thisBtn.addClass('active pressed');

    if(!thisBtn.hasClass('btn-static')){
      return $(this.el).find('.static').hide();
    }

    $(this.el).find('.static').show();
  },

  onSave: function() {
    var self = this;

    var cmds = [];

    var advanced = $($(this.el).find('input[name="show-advanced"]')[0]).is(':checked');

    var passkey = $(this.el).find('input[name="passkey"]').val();
    cmds = [
      {cmd: {flags:0, command:'set wl s \"' + self.network.ssid + '\"'}, self: self},
      {cmd: {flags:0, command:'set wl p \"' + passkey + '\"'}, self: self}
    ];

    if(advanced){
      var dhcp = _.contains($(this.el).find('button.btn-ip.active')[0].classList, 'btn-dhcp');

      cmds.push({cmd: {flags:0, command: 'set ne d e ' + (dhcp ? 1 : 0)}, self: self});

      if(!dhcp){
        var ip      = $(this.el).find('input[name="ip"]').val();
        var gateway = $(this.el).find('input[name="gateway"]').val();
        var dns     = $(this.el).find('input[name="dns"]').val();
        var netmask = $(this.el).find('input[name="netmask"]').val();

        cmds.push({cmd: {flags:0, command:'set st i ' + ip}, self: self});
        cmds.push({cmd: {flags:0, command:'set st g ' + gateway}, self: self});
        cmds.push({cmd: {flags:0, command:'set st d ' + dns}, self: self});
        cmds.push({cmd: {flags:0, command:'set st n ' + netmask}, self: self});
      }
    }

    cmds.push({cmd: {flags:0, command:'save'}, self: self});

    async.eachSeries(
      cmds,
      self.device.postCommand,
      function(err) {
        self.controller.loading(false);

        if(err){
          //handle err
        }
        self.remove();
      });
  },

  render: function() {
    this.$el.html(this.template(this.network));
  }
});
