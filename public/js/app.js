/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

$(document).ready(function(){
  App.start();
});

var App = {
  self: this,
  Models: {},
  Views: {},
  views: {},
  menu: false,
  start: function(){

    var self = this;

    self.controller = new App.Models.Controller();
    self.device = new App.Models.Device({
      controller: App.controller
    });

    //useful for local development with remote device
    //set host for local development (and alert to prevent sneaky office code downloads)
    // self.device.set({host:'http://10.5.6.116'}); self.controller.modal({content:'<h3>Development Mode: <button onclick="App.device.set({host:\'\'});App.device.init();App.controller.closeModal();">Use localhost</button></h3> Remote Device: ' + self.device.get('host') + '<br><br>[Esc to close]'});

    self.device.init();

    self.views.connect = new App.Views.Connect({
      el: $('.connect'),
      controller: App.controller,
      device: App.device
    });

    self.views.network = new App.Views.NetworkSettings({
      el: $('.network-settings'),
      controller: App.controller,
      device: App.device
    });

    self.views.system = new App.Views.System({
      el: $('.system'),
      controller: App.controller,
      device: App.device
    });

    self.views.console = new App.Views.Console({
      el: $('.console'),
      controller: App.controller,
      device: App.device
    });

    self.views.browser = new App.Views.FileBrowser({
      el: $('.browser'),
      controller: App.controller,
      device: App.device
    });

    self.views.firmware = new App.Views.Firmware({
      el: $('.firmware'),
      controller: App.controller,
      device: App.device
    });

    self.views.cloud = new App.Views.Cloud({
      el: $('.cloud'),
      controller: App.controller,
      device: App.device
    });

    // self.views.gohackme = new App.Views.GoHACKme({
    //   el: $('.gohackme'),
    //   controller: App.controller,
    //   device: App.device
    // });

    self.views.loader = new App.Views.Loader({
      el: $('.loading'),
      controller: App.controller
    });

    self.router = new App.Router();

    Backbone.history.start({pushState: true});

    $(document).on('click', 'a:not([data-bypass])', function(e) {
      var href = $(this).attr("href");
      var protocol = this.protocol + "//";
      if (href.slice(0, protocol.length) !== protocol) {
        e.preventDefault();
        App.controller.set({view: href});
      }
      if(_.contains(['small', 'medium'], App.controller.get('size'))) {
        self.onMenu();
      }
    });
    $('.menu, .overlay').click(this.onMenu);
  },

  onMenu: function() {
    if(!App.menu){
      $('.main>.active').css({width: App.controller.get('width')});
      $('.nav').fadeIn(225);
    } else {
      $('.nav').fadeOut(375);
    }
    $('.main').toggleClass('nav-open');
    $('.overlay').toggle();
    App.menu = !App.menu;
  }
};
