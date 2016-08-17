/*global Backbone:true, $:true, _:true, async:true, App:true, _webapp:true */
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

App.Views.System = Backbone.View.extend({
  els: [],
  views: [],

  template: _.template('\
<div class="content">\
<h1>System</h1>\
<div>\
<h4>Product Version</h4>\
<input name="version" value="<%- product_version %>" disabled></input>\
</div>\
<div>\
<h4>Build Date</h4>\
<input name="date" value="<%- date %>" disabled></input>\
</div>\
<div>\
<h4>ZentriOS Version</h4>\
<input name="module" value="<%- os_version %>" disabled></input>\
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
<h1>Web App</h1>\
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

    this.poll = null;

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
        {property: 'memory',          cmd: 'get', args: {args: 'sy e u'}, ret: false},
        {property: 'network_buffer',  cmd: 'get', args: {args: 'ne b u'}, ret: false},
        {property: 'uptime',          cmd: 'get', args: {args: 'ti u'}, ret: false},
        {property: 'utc',             cmd: 'get', args: {args: 'time.rtc utc'}, ret: false}
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
    var self = this;
    clearTimeout(self.poll);
    self.device.webAppUpgrade();
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
      var product_version = res.response.split(',')[0].trim(),
          date = res.response.split(',')[1].trim(),
          os_version = res.response.split(',')[2].trim();

      var board = 'N/A';

      if(res.response.split(',').length === 4) {
        board = res.response.split(',')[3].replace('Board:','');
      }

      self.device.set({
        product_version: product_version,
        date: date,
        os_version: os_version,
        board: board.trim().replace('Board:', '')
      });

      var cmds = [
          {property: 'mac',             cmd: 'get', args: {args: 'wl m'},         ret: true},
          {property: 'memory',          cmd: 'get', args: {args: 'sy e u'},       ret: false},
          {property: 'network_buffer',  cmd: 'get', args: {args: 'ne b u'},       ret: false},
          {property: 'uptime',          cmd: 'get', args: {args: 'ti u'},         ret: false},
          {property: 'uuid',            cmd: 'get', args: {args: 'sy u'},         ret: true},
          {property: 'utc',             cmd: 'get', args: {args: 'time.rtc utc'}, ret: false}
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
            self.update();
          });
    };

    self.device.zentrios.ver(parseVersion);
  }
});
