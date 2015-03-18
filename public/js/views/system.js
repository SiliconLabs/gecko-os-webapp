/*global Backbone:true, $:true, _:true, async:true, App:true, _webapp:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.System = Backbone.View.extend({
  els: [],
  views: [],
  poll: null,

  template: _.template('\
<div class="content">\
<h1>System</h1>\
<div>\
<h4>Version</h4>\
<input name="version" value="<%- version %>" disabled></input>\
</div>\
<div>\
<h4>Build Date</h4>\
<input name="date" value="<%- date %>" disabled></input>\
</div>\
<div>\
<h4>Module</h4>\
<input name="module" value="<%- module %>" disabled></input>\
</div>\
<div>\
<h4>Board</h4>\
<input name="board" value="<%- board %>" disabled></input>\
</div>\
<div>\
<h4>MAC Address</h4>\
<input name="mac" value="<%- mac %>" disabled></input>\
</div>\
<div>\
<h4>Hardware UUID</h4>\
<input name="uuid" value="<%- uuid %>" disabled></input>\
</div>\
<div>\
<h4>Memory Usage</h4>\
</div>\
<div class="col-33">\
<h5>Heap</h5>\
<input name="memory" value="<%- memory %>%" disabled></input>\
</div>\
<div class="col-33">\
<h5>Network Tx</h5>\
<input name="tx" value="<%- tx %>%" disabled></input>\
</div>\
<div class="col-33">\
<h5>Network Rx</h5>\
<input name="rx" value="<%- rx %>%" disabled></input>\
</div>\
<div>\
<h4>Uptime</h4>\
<input name="uptime" value="<%- uptime %>" disabled></input>\
</div>\
<div>\
<h4>System Time</h4>\
<input name="time" value="<%- utc %>" disabled></input>\
</div>\
<div class="clear"></div>\
<hr>\
</div>\
<div class="content">\
<h1>Webapp</h1>\
<h4>Version</h4>\
<input name="version" value="<%- webapp.version %>" disabled></input>\
<h4>Build Date</h4>\
<input name="version" value="<%= webapp.date %>" disabled></input>\
<% if(_webapp.upgradeAvailable){ %><button class="btn btn-lg active upgrade">Update</button><% } %>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose', 'formatUptime', 'update', 'systemUpgrade');
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
    'click .upgrade': 'systemUpgrade'
  },

  formatUptime: function(uptime) {

    var padLeft = function(str, n, pad) {
      return new Array(n - String(str).length + 1).join(pad || '0') + str;
    };

    uptime = uptime.replace('\r\n','');
    uptime = parseInt(uptime / 86400) + ' days, ' + padLeft(parseInt((uptime % 86400) / 3600), 2) + ':' + padLeft(parseInt((uptime % 3600)/60), 2) + ':' + padLeft(parseInt(uptime % 60), 2);
    return uptime;
  },

  update: function() {
    var self = this;

    var cmds = [
        {property: 'memory', cmd: 'get', args: {args: 'sy o'}, ret: false},
        {property: 'network_buffer', cmd: 'get', args: {args: 'ne b u'}, ret: false},
        {property: 'uptime', cmd: 'get', args: {args: 'ti u'}, ret: false},
        {property: 'utc', cmd: 'get', args: {args: 'time.rtc utc'}, ret: false}
      ];

    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err, res) {

        $(self.el).find('input[name="time"]').val(self.device.get('utc').replace('\r\n',''));
        $(self.el).find('input[name="memory"]').val(self.device.get('memory') + '%');
        $(self.el).find('input[name="rx"]').val(Number(self.device.get('network_buffer').replace('\r\n','').split(',')[0].split(':')[1]) + '%');
        $(self.el).find('input[name="tx"]').val(Number(self.device.get('network_buffer').replace('\r\n','').split(',')[1].split(':')[1]) + '%');
        $(self.el).find('input[name="uptime"]').val(self.formatUptime(self.device.get('uptime')));

        self.poll = setTimeout(self.update, 1000);
      });
  },

  systemUpgrade: function() {
    this.device.webAppUpgrade();
  },

  render: function(){
    var self = this;

    if(this.controller.get('view') !== 'system'){
      $(this.el).removeClass('active');
      clearTimeout(self.poll);
      return;
    }

    self.controller.loading(true);

    var data = self.device.toJSON();
    data.tx = '';
    data.rx = '';
    data.webapp = _webapp;

    //draw empty
    self.$el.html(self.template(data)).addClass('active');
    self.views.push(new App.Views.Loader({
      el: $(self.el).find('.loading')
    }));


    var parseVersion = function(err, res) {
      var version = res.response.split(',')[0],
          dateModule = res.response.split(',')[1].trim().replace('Built:','').split(' for '),
          board = res.response.split(',')[2];

      self.device.set({
        version: version,
        date: dateModule[0],
        module: dateModule[1],
        board: board.trim().replace('Board:', '')
      });

      var cmds = [
          {property: 'mac', cmd: 'get', args: {args: 'wl m'}, ret: true},
          {property: 'memory', cmd: 'get', args: {args: 'sy o'}, ret: false},
          {property: 'network_buffer', cmd: 'get', args: {args: 'ne b u'}, ret: false},
          {property: 'uptime', cmd: 'get', args: {args: 'ti u'}, ret: false},
          {property: 'uuid', cmd: 'get', args: {args: 'sy u'}, ret: true},
          {property: 'utc', cmd: 'get', args: {args: 'time.rtc utc'}, ret: false}
        ];

        async.eachSeries(
          cmds,
          self.device.issueCommand,
          function() {
            self.controller.loading(false);

            //check still active view
            if(self.controller.get('view') !== 'system'){
              $(self.el).removeClass('active');
              return;
            }

            data = self.device.toJSON();
            data.uptime = self.formatUptime(data.uptime);
            data.tx = self.device.get('network_buffer').replace('\r\n','').split(',')[1].split(':')[1];
            data.rx = self.device.get('network_buffer').replace('\r\n','').split(',')[0].split(':')[1];
            data.webapp = _webapp;
            data.webapp.date = new Date(data.webapp.date);

            if(self.device.get('interface') !== 'wlan') {
              self.$('.upgrade').hide();
            }

            self.$el.html(self.template(data));
            self.poll = setTimeout(self.update, 1000);
          });
    };

    self.device.wiconnect.ver(parseVersion);
  }
});
