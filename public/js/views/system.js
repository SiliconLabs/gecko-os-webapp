/*global Backbone:true, $:true, _:true, async:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.System = Backbone.View.extend({
  els: [],
  views: [],
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
    <h4>MAC</h4>\
    <input name="mac" value="<%- mac %>" disabled></input>\
  </div>\
  <div>\
    <h4>Hardware ID</h4>\
    <input name="uuid" value="<%- uuid %>" disabled></input>\
  </div>\
  <div class="clear"></div>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();

    this.controller = opts.controller;
    this.device = opts.device;

    this.listenTo(this.controller, 'change:view', this.render);
    this.render();
  },

  onClose: function(){
    this.stopListening();
  },

  events: {},

  render: function(){
    var self = this;

    if(this.controller.get('view') !== 'system'){
      $(this.el).removeClass('active');
      return;
    }

    //draw empty
    self.$el.html(self.template(self.device.toJSON())).addClass('active');
    self.views.push(new App.Views.Loader({
      el: $(self.el).find('.loading')
    }));

    self.device.getVersion(
      self,
      function() {

        var cmds = [
          {property: 'mac', cmd: 'get wl m', self: self, ret: true},
          {property: 'uuid', cmd: 'get sy u', self: self, ret: true}
        ];

        async.eachSeries(
          cmds,
          self.device.getCommand,
          function() {
            self.controller.loading(false);

            self.$el.html(self.template(self.device.toJSON()));
          });
    });
  }
});
