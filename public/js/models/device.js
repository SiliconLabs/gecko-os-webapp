/*global $:true, Backbone:true, _:true, async:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Models.Device = Backbone.Model.extend({
  commands: [],
  variables: {},
  files: [],
  defaults: {
    auto_join: '',
    board: '',
    date: '',
    dhcp: '',
    dns: '',
    gateway: '',
    host: '',
    ip: '',
    mac: '',
    module: '',
    netmask: '',
    rssi: '',
    ssid: '',
    uuid: '',
    version: '',
    web_setup: ''
  },
  checkInInterval: 45,

  initialize: function(opts) {
    var self = this;

    _.bindAll(this,
      'init', 'checkIn',
      'getCommand', 'postCommand',
      'basicInfo', 'getCommands', 'getVariables', 'getNetworks', 'getVersion');

    this.controller = opts.controller;
  },

  init: function() {
    var self = this;

    async.applyEachSeries([
        this.basicInfo,
        this.getCommands,
        this.getVariables
      ],
      self,
      function(err) {
        if(err){
          // handle err
        }

        if(self.get('web_setup') === '1') {
          setTimeout(self.checkIn, self.checkInInterval * 1000);
        }

        self.controller.loading(false);
      });
  },

  checkIn: function() {
    var self = this;

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: self.get('host') + '/command/version'
      })
      .done(function(){
        setTimeout(self.checkIn, self.checkInInterval * 1000);
      });
  },

  getCommand: function(cmd, next, attempt) {
    var self = this;

    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    App.controller.loading(true);

    cmd.ret = (cmd.ret === true); //ret - return if exists

    if(cmd.ret && self.get(cmd.property)){
      return next();
    }

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: self.get('host') + '/command/' + cmd.cmd
      })
      .fail(function() {
        if(attempt >= App.controller.get('retries')){
          return next(new Error());
        }
        self.getCommand(cmd, next, (attempt+1));
      })
      .done(function(data) {
        if(data.response){
          self.set(cmd.property, data.response);
        }
        next();
      });
  },

  postCommand: function(cmd, next, attempt) {
    var self = this;

    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    App.controller.loading(true);

    $.ajax({
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        url: self.get('host') + '/command',
        data: JSON.stringify(cmd)
      })
      .fail(function(){
        if(attempt >= App.controller.get('retries')){
          return next(new Error());
        }

        self.postCommand(cmd, next, (attempt+1));
      })
      .done(function(){
        next();
      });
  },

  basicInfo: function(self, next) {
    var cmds = [
      {property: 'auto_join', cmd: 'get wl o e', ret: false },
      {property: 'ip', cmd: 'get ne i', ret: false },
      {property: 'web_setup', cmd: 'setup status', ret: false}
    ];

    async.eachSeries(
      cmds,
      self.getCommand,
      next
    );
  },

  getCommands: function(self, next, attempt) {
    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: self.get('host') + '/command/help commands'
      })
      .fail(function(){
        if(attempt >= self.controller.get('retries')){
          return next(new Error());
        }
        self.getCommands(self, next, (attempt+1));
      })
      .done(function(data){
        if(data.response){
          _.each(data.response.split('\r\n'), function(line){
            if(line.length === 0) {
              return;
            }
            self.commands.push(line.split(':')[0].trim());
          });
        }

        next();
      });
  },

  getVariables: function(self, next, attempt) {
    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: self.get('host') + '/command/help variables'
      })
      .fail(function(){
        if(attempt >= self.controller.get('retries')){
          return next(new Error());
        }
        self.getVariables(self, next, (attempt+1));
      })
      .done(function(data){
        if(data.response){
          _.each(data.response.split('\r\n'), function(line){
            if(line.length === 0) {
              return;
            }

            //replace multiple whitespace chars with single space before splitting
            var thisVar = line.replace(/\s{2,}/g, ' ').split(' ')[1].trim();

            if(thisVar.length === 0) {
              return;
            }

            if(thisVar.indexOf('.') < 0) {
              self.variables[line.split(' ')[1].trim()] = {};
              return;
            }

            var obj = self.variables;
            _.each(thisVar.split('.'), function(part){
              if(!obj[part]){
                obj[part] = {};
              }
              obj = obj[part];
            });
          });
        }

        next();
      });
  },

  getNetworks: function(self, onResults, attempt) {
    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: self.device.get('host') + '/command/scan -v'
      })
      .fail(function(){
        if(attempt >= self.controller.get('retries')){
          self.render();
          return;
        }
        self.device.getNetworks(self, onResults, (attempt+1));
      })
      .done(function(data){
        _.each(data.response.split('\r\n'), function(line) {
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

        onResults();
      });
  },

  getVersion: function(self, next, attempt) {
    if(self.device.get('version')){
      return next();
    }

    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: self.device.get('host') + '/command/version'
      })
      .fail(function(){
        if(attempt >= self.controller.get('retries')){
          return next(new Error());
        }
        self.device.getVersion(self, next, (attempt+1));
      })
      .done(function(data){

        var version = data.response.split(',')[0],
            dateModule = data.response.split(',')[1].trim().replace('Built:','').split(' for '),
            board = data.response.split(',')[2];

        self.device.set({
          version: version,
          date: dateModule[0],
          module: dateModule[1],
          board: board.trim().replace('Board:', '')
        });

        next();
      });
  }
});
