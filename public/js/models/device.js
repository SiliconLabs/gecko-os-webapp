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
    ghm_activated: '',
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
      'basicInfo');

    this.controller = opts.controller;
  },

  init: function() {
    var self = this;

    self.controller.loading(true);

    async.series([
        this.basicInfo
      ],
      function(err) {
        if(err){
          // handle err
        }

        if(self.get('web_setup')) {
          setTimeout(self.checkIn, self.checkInInterval * 1000);
        }

        self.controller.loading(false);
      });
  },

  checkIn: function() {
    var self = this;

    var done = function(resp, next) {
      setTimeout(self.checkIn, self.checkInInterval * 1000);
    };

    var cmd = {
      cmd: 'ver',
      done: done
    };

    self.getCommand(cmd);
  },

  //cmd: {
  //      cmd: 'version',
  //      [property]: 'version', //optional - backbone property name to store returned value
  //      [ret]: true, //optional - return immidiate if property already contains value, prevents excessive requests
  //      [fail]: function(resp, next), //optional - function to execute on ajax failure, will be passed ajax RESPonse and callback reference
  //      [done]: function(resp, next), //optional - function to execute on ajax completion, will be passed ajax RESPonse and callback reference
  //    }
  getCommand: function(cmd, next, attempt) {
    var self = this;

    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    cmd.ret = (cmd.ret === true); //ret - return if exists

    if(cmd.ret && self.get(cmd.property)){
      return next();
    }

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: self.get('host') + '/command/' + cmd.cmd
        //put auth here
      })
      .fail(function(resp) {
        //handle auth failure here
        //
        if(attempt >= App.controller.get('retries')){
          var fail = (typeof cmd.fail === 'function') ? cmd.fail(resp, next) : next(new Error());

          if(typeof fail === 'function') {
            return fail();
          }

          return;
        }
        self.getCommand(cmd, next, (attempt+1));
      })
      .done(function(resp) {
        if(cmd.property && resp.response){
          self.set(cmd.property, resp.response);
        }

        var done = (typeof cmd.done === 'function') ? cmd.done(resp, next): next();

        if(typeof done === 'function') {
          done();
        }

      });
  },

  //cmd: {
  //      cmd: {flags: 0, command: 'nup'},
  //      [fail]: function(resp, next), //optional - function to execute on ajax failure, will be passed ajax RESPonse and callback reference
  //      [done]: function(resp, next), //optional - function to execute on ajax completion, will be passed ajax RESPonse and callback reference
  //    }
  postCommand: function(cmd, next, attempt) {
    var self = this;

    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    $.ajax({
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        url: self.get('host') + '/command',
        data: JSON.stringify(cmd.cmd)
        //put auth here
      })
      .fail(function(resp){
        //handle auth failure here
        //
        if(attempt >= App.controller.get('retries')){
          var fail = (typeof cmd.fail === 'function') ? cmd.fail(resp, next) : next(new Error());

          if(typeof fail === 'function') {
            return fail();
          }

          return;
        }

        self.postCommand(cmd, next, (attempt+1));
      })
      .done(function(resp){
        var done = (typeof cmd.done === 'function') ? cmd.done(resp, next): next();

        if(typeof done === 'function') {
          done();
        }
      });
  },

  basicInfo: function(next) {
    var self = this;

    var parseCommands = function(resp, done) {
      if(resp.response){
        _.each(resp.response.split('\r\n'), function(line){
          if(line.length === 0) {
            return;
          }
          self.commands.push(line.split(':')[0].trim());
        });
      }

      done();
    };

    var parseVariables = function(resp, done) {
      if(resp.response){
        _.each(resp.response.split('\r\n'), function(line){
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

      done();
    };

    var cmds = [
      {property: 'ip', cmd: 'get ne i', ret: false },
      {property: 'web_setup', cmd: 'setup status', ret: false},
      {cmd: 'help commands', done: parseCommands},
      {cmd: 'help variables', done: parseVariables}
    ];

    async.eachSeries(
      cmds,
      self.getCommand,
      function(err) {
        if(err) {
          //handle err
        }

        var web_setup = self.get('web_setup').replace('\r\n','');

        switch(web_setup){
          case '0':
          case 'off':
          case 'false':
            web_setup = false;
            break;
          case '1':
          case 'on':
          case 'true':
            web_setup = true;
            break;
        }

        self.set({web_setup: web_setup});

        if(web_setup){
          $('.nav ul li.setup').show('fast');
        } else {
          $('.nav ul li').show('fast');
        }

        self.controller.set('view','connect');

        next();
      }
    );
  }

});
