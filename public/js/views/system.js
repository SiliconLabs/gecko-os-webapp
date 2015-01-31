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
<input name="memory" value="<%- memory %>%" disabled></input>\
</div>\
<div>\
<h4>Uptime (seconds)</h4>\
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
<input name="version" value="<%- webapp.version %>-<%- webapp.hash %>" disabled></input>\
<h4>Build Date</h4>\
<input name="version" value="<%= webapp.date %>" disabled></input>\
<button class="btn btn-lg active upgrade">Update</button>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose', 'getTime', 'onUpgrade');
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
    'click .upgrade': 'onUpgrade'
  },

  getTime: function() {
    var self = this;

    self.device.issueCommand({cmd: 'get', args: {args: 'time.rtc utc'}}, function(err, res) {
      var time = res.response.replace('\r\n','');

      self.device.set({utc: time});

      $(self.el).find('input[name="time"]').val(time);

      self.poll = setTimeout(self.getTime, 1000);
    });
  },

  onUpgrade: function() {
    var self = this;

    self.controller.modal({
      systemModal: true,
      content: '<h2>Updating Webapp...</h2><div class="progress-bar"><div class="progress"></div></div>'
    });

    var files = [
      'index.html',
      'wiconnect.js.gz',
      'wiconnect.css.gz',
      'unauthorized.html'
    ];

    var filesComplete = 0;

    async.eachSeries(
      files,
      function(file, next) {
        self.device.wiconnect.http_download(
          {args: 'http://resources.ack.me/webapp/2.1/latest/' + file + ' webapp/' + file},
          function(err, res) {
            filesComplete += 1;
            $('.progress').css({width: String((filesComplete / files.length)*100) + '%'});
            next();
          });
      },
      function(err, res) {
        setTimeout(function(){top.location = top.location;}, 3000);
      });
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
          {property: 'memory', cmd: 'get', args: {args: 'sy o'}, ret: true},
          {property: 'uptime', cmd: 'get', args: {args: 'ti u'}, ret: true},
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
            data.webapp = _webapp;
            data.webapp.date = new Date(data.webapp.date);

            self.$el.html(self.template(data));
            self.getTime();
          });
    };

    self.device.wiconnect.ver(parseVersion);
  }
});
