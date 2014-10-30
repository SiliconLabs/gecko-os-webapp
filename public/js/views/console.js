/*global Backbone:true, $:true, _:true, App:true, Terminal:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Console = Backbone.View.extend({
  template: _.template('\
<h1>Console</h1>\
<div class="terminal">\
  <output></output>\
  <div id="input-line" class="input-line">\
    <div class="prompt">&gt;</div><div><input class="cmdline" autofocus /></div>\
  </div>\
</div>'),
  history: [],
  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose', 'onClick', 'historyHandler', 'onCommand', 'clear', 'printOutput', 'tabComplete');
    this.delegateEvents();

    this.controller = opts.controller;
    this.device = opts.device;

    this.historyPosition = 0;
    this.historyTemp = 0;
    this.tabIndex = 0;

    this.listenTo(this.controller, 'change:view', this.render);
    this.render();
  },
  onClose: function() {
    this.stopListening();
  },
  events: {
    'click #input-line>.cmdline': 'onClick',
    'click .terminal': 'onClick',
    'keyup #input-line .cmdline': 'historyHandler',
    'keydown #input-line .cmdline': 'onCommand'
  },
  render: function() {
    if(this.controller.get('view') !== 'console'){
      $(this.el).removeClass('active');
      return;
    }

    this.$el.html(this.template()).addClass('active');

    this.output = $(this.el).find('output')[0];
    this.cmdLine = $(this.el).find('#input-line .cmdline')[0];

  },
  onClick: function(e) {
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

    if(match){
      this.cmdLine.value = match[this.tabIndex % match.length];
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
      if (this.cmdLine.value) {
        this.history[this.history.length] = this.cmdLine.value;
        this.historyPosition = this.history.length;
      }

      // Duplicate current input and append to output section.
      self.newPrompt = this.cmdLine.parentNode.parentNode.cloneNode(true);
      self.newPrompt.removeAttribute('id');
      self.newPrompt.classList.add('line');
      self.newPrompt.autofocus = false;
      self.newPrompt.readOnly = true;

      var cmd, args;

      // Parse out command, args, and trim off whitespace.
      if (this.cmdLine.value && this.cmdLine.value.trim()) {
        args = this.cmdLine.value.split(' ').filter(function(val, i) {
          return val;
        });
        cmd = args[0].toLowerCase();
        args = args.splice(1); // Remove cmd from arg list.
      }

      switch (cmd) {
        case 'clear':
          this.clear(this);
          return;


        case 'file_create':
        case 'fcr':
        case 'stream_write':
        case 'write':
          self.output.appendChild(self.newPrompt);
          self.cmdLine.value = ''; // Clear/setup line for next input.
          self.printOutput('[not currently supported in web console]');
          break;

        // case 'reboot':
        //   //display loader
        //   //accept failure as device restarts
        //   //then sensibly try last know IP after timeout
        //   break;

        case 'get':
        case 'help':
        case 'scan':
        case 'version':
          self.getCommand((cmd + '%20' + args.join('%20')), self.cmdLine.scrollIntoView);
          break;

        default:
          if (cmd) {
            self.postCommand(cmd + ' ' + args.join(' '), self.cmdLine.scrollIntoView);
          }

      }
    }

    this.tabIndex = 0;
    this.tabInput = null;
  },

  getCommand: function(cmd, attempt) {
    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    var self = this;

    $.ajax({url: self.device.get('host') + '/command/' + cmd})
      .fail(function(){
        if(attempt >= self.controller.get('retries')){
          return;
        }
        self.getCommand(cmd, (attempt+1));
      })
      .done(function(res){
        self.output.appendChild(self.newPrompt);
        self.cmdLine.value = ''; // Clear/setup line for next input.

        _.each(res.response.split('\r\n'), function(line){
          self.printOutput(line);
        });
      });
  },

  postCommand: function(cmd, attempt) {
    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    var self = this;

    $.ajax({
        type: "POST",
        contentType: 'application/json',
        dataType: 'json',
        url: self.device.get('host') + '/command',
        data: JSON.stringify({flags:0, command: cmd})
      })
      .fail(function(res){
        if(attempt >= self.controller.get('retries')){
          self.output.appendChild(self.newPrompt);
          self.cmdLine.value = '';
          self.printOutput('Error: POST command/' + cmd + ' ' + res.status + ': ' + res.statusText + '');

          return;
        }

        self.postCommand(cmd, (attempt+1));
      })
      .done(function(res) {
        self.output.appendChild(self.newPrompt);
        self.cmdLine.value = ''; // Clear/setup line for next input.

        _.each(res.response.split('\r\n'), function(line){
          self.printOutput(line);
        });
      });
  },

  clear: function() {
    this.output.innerHTML = '';
    this.cmdLine.value = '';
  },

  printOutput: function(line) {
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
    this.output.scrollIntoView();
    this.cmdLine.scrollIntoView();
  }
});
