/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

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
      controller: App.controller,
      host: 'http://192.168.10.120' //useful for local development with remote device
    });

    self.views.quickstart = new App.Views.QuickStart({
      el: $('.quickstart'),
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
    }
    $('.main').toggleClass('nav-open');
    $('.overlay').toggle();
    App.menu = !App.menu;
  }
};
