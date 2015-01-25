/*global Backbone:true, $:true, _:true, App:true, Terminal:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Console = Backbone.View.extend({
  buffer: '',

  history: [],
  cmdMask: {
    rm: 'fde'
  },

  template: _.template('\
<h1>Console</h1>\
<div class="terminal">\
<output></output>\
<div id="input-line" class="input-line">\
<div class="prompt">&gt;</div><div><input class="cmdline" autofocus spellcheck="false" autocapitalize="off" /></div>\
</div>\
<div id="next-line" class="input-line">\
<div><input class="nextline" spellcheck="false" autocapitalize="off" /></div>\
</div>\
</div>'),
  initialize: function(opts) {

    _.bindAll(this, 'render',
              'onClose', 'onClick',
              'onCommand', 'issueCommand', 'doCommand',
              'historyHandler', 'tabComplete',
              'printOutput', 'printLine',
              'clear');

    this.delegateEvents();

    this.controller = opts.controller;
    this.device = opts.device;

    this.historyPosition = 0;
    this.historyTemp = 0;
    this.tabIndex = 0;

    if(this.controller.ls && this.controller.ls.console){
      this.history = JSON.parse(this.controller.ls.console).history;
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
    if(this.controller.get('view') !== 'console'){
      $(this.el).removeClass('active');
      return;
    }

    this.$el.html(this.template()).addClass('active');

    this.output = $(this.el).find('output')[0];
    this.cmdLine = $(this.el).find('#input-line .cmdline')[0];

    this.cmdLine.focus();

  },

  onClick: function(e) {
    var textSel = "";
    if (typeof window.getSelection !== "undefined") {
        textSel = window.getSelection().toString();
    } else if (typeof document.selection !== "undefined" && document.selection.type === "Text") {
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
      this.cmdLinevalue = this.cmdLine.value; // Sets cursor to end of input.
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

        if(varParts[varParts.length - 1].length === 0) {
          return; //nothing after last .
        }

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

      regex = new RegExp('^(' + this.tabInput + ')');

      match = _.filter(keys, function(variable){
        return variable.match(regex);
      });

      if(match.length > 0){
        this.cmdLine.value = newLine + match[this.tabIndex % match.length];
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

          if(this.controller.ls){
            this.controller.ls.console = JSON.stringify({history: _.last(this.history, 1024)});
          }
        }

        this.historyPosition = this.history.length;
      }

      // Duplicate current input and append to output section.
      self.newPrompt = this.cmdLine.parentNode.parentNode.cloneNode(true);
      self.newPrompt.removeAttribute('id');
      self.newPrompt.classList.add('line');
      self.newPrompt.autofocus = false;
      self.newPrompt.readOnly = true;
      self.newPrompt.spellcheck = false;
      self.newPrompt.autocapitalize = "off";

      this.tabIndex = 0;
      this.tabInput = null;

      var cmdPipe;

      // Parse out command, args, and trim off whitespace.
      if (this.cmdLine.value && this.cmdLine.value.trim()) {

        cmdPipe = this.cmdLine.value.split('|');

        self.doCommand(cmdPipe[0], _.rest(cmdPipe));
      }
    }
  },

  doCommand: function(cmd, pipe, data) {
    var self = this;
    var args;

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
      case 'clear':
        this.clear(this);
        return;

      case 'grep':
        if(!_.isArray(data)){
          return;
        }

        var grepd = $.grep(data, function(d) {
            var re = args.join(' ');
            if(args[0] === '-v'){ //ignore invert flag
              re = _.rest(args).join(' ');
            }
            re = new RegExp(re);
            return d.match(re);
          }, (args[0] === '-v'));
        console.log(grepd);

        if(pipe.length > 0) {
          return self.doCommand(pipe[0], _.rest(pipe), grepd);
        }

        self.printOutput(grepd);
        break;

      case 'history':
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

      case 'file_create':
      case 'fcr':
      case 'stream_write':
      case 'write':
      case 'smtp_send':
      case 'smtp':
        self.output.appendChild(self.newPrompt);
        self.cmdLine.value = ''; // Clear/setup line for next input.
        self.printOutput('[not supported in web console]');
        self.cmdLine.focus();
        break;

      // case 'reboot':
      // case 'ota':
      // case 'ghm_activate':
      //   //display loader
      //   //ping-reconnect sequence
      //   break;

      default:
        if (cmd) {
          if(self.cmdMask.hasOwnProperty(cmd)){
            cmd = self.cmdMask[cmd];
          }
          self.issueCommand({
            cmd: cmd, args: {args: args.join(' '), timeout: 60000},
            done: (pipe.length > 0 ? nextPipe : null)
          });
        }

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
  }
});
