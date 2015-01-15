/*global $:true, Backbone:true, _:true, async:true, App:true, WiConnectDevice:true */
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
    ota_host: '',
    ota_port: '',
    rssi: '',
    ssid: '',
    uuid: '',
    version: '',
    web_setup: ''
  },
  checkInInterval: 45,
  wiconnect: null,

  initialize: function(opts) {
    var self = this;

    _.bindAll(this,
      'init', 'checkIn',
      'issueCommand', 'postCommand',
      'basicInfo');

    this.controller = opts.controller;
  },

  init: function() {
    var self = this;

    self.controller.loading(true);

    self.wiconnect = new WiConnectDevice({
      host: self.get('host'),
      timeout: 5000,
      retries: 3
    });

    async.series([
        this.basicInfo
      ],
      function(err) {
        if(err){
          // handle err
        }

        if(self.get('web_setup')) {
          self.controller.loading(false);
          setTimeout(self.checkIn, self.checkInInterval * 1000);
        }

      });
  },

  checkIn: function() {
    var self = this;

    self.wiconnect.ver(function(err, res) {
      setTimeout(self.checkIn, self.checkInInterval * 1000);
    });
  },

  //cmd: {
  //      cmd: 'nup',
  //      [args]: { //optional - command arguments
  //                args: '-s',
  //                flags: 0,
  //                retries: 1,
  //                timeout: 120000
  //              },
  //      [property]: 'version', //optional - backbone property name to store returned value
  //      [ret]: true, //optional - return immidiate if property already contains value, prevents excessive requests
  //      [fail]: function(resp, next), //optional - function to execute on ajax failure, will be passed ajax RESPonse and callback reference
  //      [done]: function(resp, next), //optional - function to execute on successful ajax completion, will be passed ajax RESPonse and callback reference
  //      [always]: function(resp, next), //optional - function to execute on ajax completion
  //    }
  issueCommand: function(cmd, next) {
    var self = this;

    cmd.ret = (cmd.ret === true); //ret - return if exists

    if(cmd.ret && self.get(cmd.property)){
      return next();
    }

    if(!self.wiconnect.hasOwnProperty(cmd.cmd)) {
      //not supported by WiConnectJS
      console.log('posting', cmd.cmd);
      return self.postCommand({command: cmd.cmd, flags: cmd.args.flags || 0}, next);
    }

    cmd.args = cmd.args || {};

    var xhr = self.wiconnect[cmd.cmd](cmd.args, function(err, res) {
      if(cmd.property && res.response){
          self.set(cmd.property, res.response);
      }
      next();
    });

    if(typeof cmd.done === 'function'){
      xhr.done(function(res){cmd.done(res, next);});
    }

    if(typeof cmd.fail === 'function'){
      xhr.fail(function(res){cmd.fail(res, next);});
    }

    if(typeof cmd.always === 'function'){
      xhr.always(function(res){cmd.always(res, next);});
    }

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
      })
      .fail(function(resp){
        if(attempt >= App.controller.get('retries')){
          var fail = (typeof cmd.fail === 'function') ? cmd.fail(resp, next) : next(new Error());

          if(typeof fail === 'function') {
            return fail(resp);
          }

          return;
        }

        self.postCommand(cmd, next, (attempt+1));
      })
      .done(function(resp){
        var done = (typeof cmd.done === 'function') ? cmd.done(resp, next): next();

        if(typeof done === 'function') {
          done(resp);
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
      {property: 'ip', cmd: 'get', args:{args: 'ne i', ret: false}},
      {property: 'web_setup', cmd: 'setup', args: {args: 'status', ret: false}},
      {cmd: 'help', args: {args: 'commands'}, done: parseCommands},
      {cmd: 'help', args: {args: 'variables'}, done: parseVariables}
    ];

    async.eachSeries(
      cmds,
      self.issueCommand,
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
          self.controller.set('view','connect');
        } else {
          $('.nav ul li').show('fast');
          self.controller.set('view','network');
        }

        next();
      }
    );
  }

});
