/*global Backbone:true, async:true,  $:true, _:true, App:true, Terminal:true, _webapp:true */
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

App.Views.Console = Backbone.View.extend({
  buffer: '',

  reconnect: {
    content: 'Device rebooting...',
    attempt: 0,
    retries: 60,
    timeout: 1000,
    delay: 1000
  },

  history: [],
  alias:{},
  cmdMask: {
    rm: 'fde'
  },

  templates: {
    terminal: _.template('\
<h1>Console</h1>\
<div class="terminal">\
<output></output>\
</div>'),

    input: _.template('\
<div id="input-line" class="input-line">\
<div class="prompt">&gt;</div>&nbsp;<div><input class="cmdline" autofocus spellcheck="false" autocapitalize="off" /></div>\
</div>'),

    next: _.template('\
<div id="next-line" class="input-line">\
<div><input class="nextline" spellcheck="false" autocapitalize="off" /></div>\
</div>')
  },

  initialize: function(opts) {

    _.bindAll(this, 'render', 'addCmdLine',
              'onClose', 'onClick',
              'onCommand', 'issueCommand', 'doCommand',
              'historyHandler', 'tabComplete',
              'printOutput', 'printLine',
              'tryReconnect',
              'clear');

    this.delegateEvents();

    this.controller = opts.controller;
    this.device = opts.device;

    this.historyPosition = 0;
    this.historyTemp = 0;
    this.tabIndex = 0;

    if(this.controller.ls && this.controller.ls.console){
      var console   = JSON.parse(this.controller.ls.console);
      this.alias    = console.alias   || {};
      this.history  = console.history || [];
      this.historyPosition = this.history.length;
    }

    this.listenTo(this.controller, 'change:view', this.render);
    this.render();
  },

  onClose: function() {
    this.stopListening();
  },

  events: {
    'click #input-line>.cmdline': 'onClick',
    'mouseup .terminal': 'onClick',
    'keyup #input-line .cmdline': 'historyHandler',
    'keydown #input-line .cmdline': 'onCommand',
    'keydown #next-line .nextline': 'onNext'
  },

  render: function() {
    var self = this;

    if(self.controller.get('view') !== 'console'){
      $(self.el).removeClass('active');
      return;
    }

    self.$el.html(self.templates.terminal()).addClass('active');

    self.controller.loading(false);

    self.output = $(self.el).find('output')[0];

    self.printLine('ZentriOS Web App Console - v' + _webapp.version);

    if(self.device.commands.length > 0 && Object.keys(self.device.variables).length > 0){
      //commands and variables already loaded, nothing to do
      return self.addCmdLine();
    }

    async.waterfall([
      function(next) {
        self.printLine('loading commands...');
        self.device.zentrios.help({args: 'commands'}, function(err, res){
          if(err) {
            return next(err);
          }
          self.device.parseCommands(res, next);
        });
      },
      function(next) {
        self.printLine('loading variables...');
        self.device.zentrios.help({args: 'variables'}, function(err, res){
          if(err) {
            return next(err);
          }
          self.device.parseVariables(res, next);
        });
      }
    ], function(err){
      if(err) {
        //handle err
      }

      self.printLine('Ready.');
      return self.addCmdLine();
    });
  },

  addCmdLine: function(){
    this.$('.terminal').append(this.templates.input());
    this.$('.terminal').append(this.templates.next());
    this.cmdLine = $(this.el).find('#input-line .cmdline')[0];
    this.cmdLine.focus();
  },

  onClick: function(e) {
    var textSel = "";
    if (window.getSelection && typeof window.getSelection === 'function') {
        textSel = window.getSelection().toString();
    } else if (document.selection && typeof document.selection.createRange === 'function' && document.selection.type === "Text") {
        textSel = document.selection.createRange().text;
    }
    if(textSel.length > 0) {
      return;
    }
    this.cmdLine.value = this.cmdLine.value;
    this.cmdLine.focus();
  },

  historyHandler: function(e) {
    if (e.keyCode !== 38 && e.keyCode !== 40) {
      return;
    }

    if (this.history.length) {
      if (this.history[this.historyPosition]) {
        this.history[this.historyPosition] = this.cmdLine.value;
      } else {
        this.historyTemp = this.cmdLine.value;
      }

      switch (e.keyCode) {
        case 38:
          this.historyPosition--;
          if (this.historyPosition < 0) {
            this.historyPosition = 0;
          }
          break;
        case 40:
          this.historyPosition++;
          if (this.historyPosition > this.history.length) {
            this.historyPosition = this.history.length;
          }
          break;
      }

      this.cmdLine.value = this.history[this.historyPosition] ? this.history[this.historyPosition] : this.historyTemp;
      this.cmdLine.value = this.cmdLine.value; // Sets cursor to end of input.
    }
  },

  tabComplete: function() {
    var cmd, varb, args, match, regex;

    args = this.cmdLine.value.split(' ').filter(function(val, i) {
      return val;
    });
    cmd = args[0].toLowerCase();
    args = args.splice(1);

    //autocomplete variables
    if(_.contains(['get', 'set'], cmd) && args[0]){
      var newLine = '';
      newLine = cmd + ' ';

      varb = args[0].toLowerCase();
      args = args.splice(1);

      if(args[0]){ return; } //values or flags present dont want to overwrite

      var keys;
      var thisObject = this.device.variables;

      if(varb.lastIndexOf('.') > 0) { //tab complete subvariables
        var varParts = varb.split('.');

        if(!this.tabInput){
          this.tabInput = varParts[varParts.length - 1];
        }

        newLine += varb.substr(0, varb.lastIndexOf('.') + 1);

        _.each(varParts.slice(0, varParts.length - 1), function(subVar) {
          if(!thisObject){
            return;
          }
          thisObject = thisObject[subVar];
        });
      }

      keys = Object.keys(thisObject);

      if(!this.tabInput){
        this.tabInput = varb;
      }

      match = keys;

      if(this.tabInput[this.tabInput.length-1] !== '.') { //sub variable
        regex = new RegExp('^(' + this.tabInput + ')');

        match = _.filter(keys, function(variable){
          return variable.match(regex);
        });
      }

      if(match.length > 0){
        newLine = newLine + match[this.tabIndex % match.length];

        if(match.length === 1 && Object.keys(thisObject[match[0]]).length > 0) {
          // only subvar and has children
          newLine += '.';
          this.tabInput = newLine;
        } else if(match.length === 1) {
          // only matching subvar with no further subvars
          newLine += ' ';
        }

        this.cmdLine.value = newLine;
        this.tabIndex++;
        return;
      }

      return;
    }

    if(args[0]){ return; } //values or flags present dont want to overwrite

    if(!this.tabInput){
      this.tabInput = cmd;
    }

    regex = new RegExp('^(' + this.tabInput + ')', 'g');

    match = _.filter(this.device.commands, function(command){
      return command.match(regex);
    });

    if(match.length > 0){
      this.cmdLine.value = match[this.tabIndex % match.length] + ' ';
      this.tabIndex++;
      return;
    }

    return;
  },

  onCommand: function(e) {
    var self = this;
    if (e.keyCode === 9) { // Tab
      e.preventDefault();
      if(this.cmdLine.value && this.cmdLine.value.trim()){
        return this.tabComplete();
      }
    } else if (e.keyCode === 13) { // enter
      // Save shell history.
      if(this.cmdLine.value) {

        if(this.history[this.history.length - 1] !== this.cmdLine.value) {
          this.history[this.history.length] = this.cmdLine.value;
        }

        this.historyPosition = this.history.length;
      }

      // Duplicate current input and append to output section.
      self.newPrompt = this.cmdLine.parentNode.parentNode.cloneNode(false);
      self.newPrompt.removeAttribute('id');
      self.newPrompt.classList.remove('input-line');
      self.newPrompt.classList.add('ls-files');
      self.newPrompt.innerHTML = '<span class="prompt">&gt;</span>&nbsp;<span class="cmd">' + this.cmdLine.value + '</span>';

      var cmdPipe;

      // Parse out command, args, and trim off whitespace.
      if (this.cmdLine.value && this.cmdLine.value.trim()) {

        // split on | unless | is enclose in ""
        cmdPipe = _.filter(this.cmdLine.value.match(/(?:[^\|"]+|"[^"]*")+/g), function(cmd){return cmd.trim().length > 0;});

        self.doCommand(cmdPipe[0], _.rest(cmdPipe));
      }
    }
    this.tabIndex = 0;
    this.tabInput = null;
  },

  doCommand: function(cmd, pipe, data) {
    var self = this;
    var args, re;

    cmd = cmd.trim();

    // ![historyPosition] - reference cmd in history
    if(cmd[0] === '!' && (Number(cmd.substring(1, cmd.length)) - 1) < this.history.length){
      cmd = this.history[Number(cmd.substring(1, cmd.length)) - 1];
    }

    args = cmd.split(' ').filter(function(val, i) {
      return val;
    });
    cmd = args[0].toLowerCase();
    args = args.splice(1); // Remove cmd from arg list.

    //focus on next line to show command being processed
    $(this.el).find('.nextline').focus();

    var pad = function(str, len, padChar) {
      return (len <=str.length) ? str : pad(padChar + str, len, padChar);
    };

    var nextPipe = function(res){
      self.doCommand(pipe[0], _.rest(pipe), res.response.split('\r\n'));
    };

    switch (cmd) {
      case 'alias':
        if(args[0]){
          args = args.join(' ');
          re = /(\'(.+)\')|(\"(.+)\")/;
          var alias = args.substring(0, args.indexOf('='));
          if(self.device.zentrios.hasOwnProperty(alias) || self.cmdMask.hasOwnProperty(alias)) {
            self.printOutput(['Invalid alias name']);
            break;
          }
          var aliasCmd = re.exec(args.substring(args.indexOf('=')));
          self.alias[alias] = (aliasCmd[2] ? aliasCmd[2] : aliasCmd[4]);
        }
        self.printOutput();
        break;

      case 'clear':
        this.clear(this);
        break;

      case 'grep':
        if(!_.isArray(data)){
          self.printOutput();
          return;
        }

        var grepd = $.grep(data, function(d) {
            re = args.join(' ');
            if(args[0] === '-v'){ //ignore invert flag
              re = _.rest(args).join(' ');
            }
            re = new RegExp(re);
            return d.match(re);
          }, (args[0] === '-v'));

        if(pipe.length > 0) {
          return self.doCommand(pipe[0], _.rest(pipe), grepd);
        }

        self.printOutput(grepd);
        break;

      case 'history':
        if(args && (args[0] === 'clear')) {
          self.history = [];
          self.historyPosition = 0;
          if(self.controller.ls && self.controller.ls.console) {
            self.controller.ls.console = JSON.stringify({history: []});
          }
          self.printOutput([]);
          break;
        }
        var padLength = String(self.history.length).length + 1;
        var history = [];
        _.each(_.last(self.history, ((Number(args[0]) > 0)) ? Number(args[0]) : self.history.length), function(hist, h) {
          history.push(pad((Number(args[0] > 0 ? self.history.length - Number(args[0]) + h: h)) + 1, padLength, ' ') + ' ' + hist);
        });

        if(pipe.length > 0) {
          return self.doCommand(pipe[0], _.rest(pipe), history);
        }

        self.printOutput(history);
        break;

      case '_webapp':
        self.printOutput([JSON.stringify(_webapp)]);
        break;

      case 'unalias':
        if(args[0]) {
          if(self.alias.hasOwnProperty(args[0])) {
            delete self.alias[args[0]];
          }
        }
        self.printOutput();
        break;

      case 'file_create':
      case 'fcr':
      case 'stream_write':
      case 'write':
      case 'smtp_send':
      case 'smtp':
        self.printOutput(['[not supported in web console]']);
        break;

      case 'ota':
        self.reconnect.content = 'Device Updating...';
        self.reconnect.retries = 100;
        self.reconnect.timeout = 4000;
        self.reconnect.delay   = 1000;
      /* falls through */
      case 'reboot':
        //no piping
        self.reconnect.attempt = 0;
        self.controller.modal({systemModal: true, content:'<h2>' + self.reconnect.content +'</h2><div class="progress-bar"><div class="progress"></div></div>'});
        self.issueCommand({
          cmd: cmd, args: {args: args.join(' '), timeout: self.reconnect.timeout, retries: self.reconnect.retries},
          done: self.tryReconnect
        });
        break;

      default:
        if (cmd) {
          if(self.cmdMask.hasOwnProperty(cmd)) {
            cmd = self.cmdMask[cmd];
          }
          if(self.alias.hasOwnProperty(cmd)) {
            cmd = self.alias[cmd];
          }
          if(cmd.indexOf('|') > 0) {
            var cmdPipe = _.filter(cmd.match(/(?:[^\|"]+|"[^"]*")+/g), function(c){return c.trim().length > 0;});
            cmd = cmdPipe[0];
            pipe = _.rest(cmdPipe);
            return this.doCommand(cmd, pipe, data);
          }
          self.issueCommand({
            cmd: cmd, args: {args: args.join(' '), timeout: 60000},
            done: (pipe.length > 0 ? nextPipe : null)
          });
        }

    }

    if(this.controller.ls){
      this.controller.ls.console = JSON.stringify({
        history: _.last(this.history, 1024),
        alias: this.alias
      });
    }
  },

  issueCommand: function(cmd, attempt) {
    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    var self = this;

    self.buffer = '';

    var fail = function(err, res) {
      self.printOutput(['Error: ' + cmd.cmd + (cmd.args.args ? ' ' + cmd.args.args : '') + ' : ' + err.message]);
    };

    var done = function(res, next) {
      self.printOutput(res.response.split('\r\n'));
    };

    self.device.issueCommand({cmd: cmd.cmd, args: cmd.args, done: (cmd.done ? cmd.done : done), fail: (cmd.fail ? cmd.fail : fail) });
  },

  onNext: function(e) {
    e.stopPropagation();
    e.preventDefault();
    this.buffer += String.fromCharCode(e.which).toLowerCase();
  },

  clear: function() {
    this.output.innerHTML = '';
    this.cmdLine.value = '';
    this.cmdLine.focus();
  },

  printLine: function(line) {
    line = line
            .replace(/&/g, '&amp;')
            .replace(/\ /g, "&nbsp;")
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?/g, "<a href='$1$2.$3$4' target='_blank'>$1$2.$3$4</a>");

    var html = '<div class="ls-files">' + line + '</div>';

    this.output.insertAdjacentHTML('beforeEnd', html);
  },

  printOutput: function(lines) {
    this.output.appendChild(this.newPrompt);
    this.cmdLine.value = this.buffer; // Clear/setup line for next input.
    this.cmdLine.focus();
    _.each(lines, this.printLine);
    this.output.scrollIntoView();
    this.cmdLine.scrollIntoView();
  },

  tryReconnect: function() {
    var self = this;

    setTimeout(function(){
      self.device.zentrios.ver(
        {retries: 1, timeout: self.reconnect.timeout},
        function(err, res) {
          if(err){
            if(self.reconnect.attempt >= self.reconnect.retries){
              return self.controller.modal({content:'<h2>Unable to reconnect to device.</h2>'});
            }

            self.reconnect.attempt += 1;
            $('.progress').css({width: String((self.reconnect.attempt / self.reconnect.retries)*100) + '%'});

            return self.tryReconnect();
          }

          //reset defaults
          self.reconnect = {
            content: 'Device rebooting...',
            attempt: 0,
            retries: 60,
            timeout: 1000,
            delay: 1000
          };

          self.printOutput(['Success']);
          self.controller.closeModal();
        });
    }, self.reconnect.delay);

  }
});
