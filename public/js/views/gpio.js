/*global Backbone:true, $:true, _:true, async:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.GPIO = Backbone.View.extend({
  els: [],
  views: [],
  gpios: '',
  poll: null,
  filter: true,

  template: _.template('<div class="content">\
<h1>GPIO Configuration</h1>\
<div class="btn-bar filter">\
<button class="btn  btn-filter col-50 <%= filter ? "active pressed" : "" %>" data-filter="inuse">IN USE</button>\
<button class="btn  btn-filter col-50 <%= !filter ? "active pressed" : "" %>" data-filter="all">ALL</button>\
</div>\
<div class="gpios">\
</div>\
<div class="clear"></div>\
</div>'),

  templates: {
    gpio_input: _.template('\
<div class="no"><%= id%> : </div>\
<div><%= alias ? alias + " - " : "" %><%= description %></div>\
<div class="state value">\
<%= state ? "High" : "Low" %>\
</div>'),

    gpio_output: _.template('\
<div class="no"><%= id%> : </div>\
<div><%= alias ? alias + " - " : "" %><%= description %></div>\
<div class="btn-bar">\
<button class="btn btn-sm btn-gpio <%= !state ? "active pressed" : "" %>" data-gpio="<%= id%>" data-value="0">Low</button>\
<button class="btn btn-sm btn-gpio <%= state ? "active pressed" : "" %>" data-gpio="<%= id%>" data-value="1">High</button>\
</div>'),

    basic: _.template('\
<div class="no"><%= id%> : </div>\
<div><%= description %></div>'),

    default: _.template('\
<div class="no"><%= id%> : </div>\
<span>unused</span>')
  },

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose', 'getGPIO', 'onGPIO', 'onFilter', 'onBtn');
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
    'click .btn-filter:not(.active)' : 'onFilter',
    'click .btn-gpio:not(.active)' : 'onBtn'
  },

  onFilter: function() {
    this.filter = !this.filter;

    this.render();
  },

  onBtn: function(e) {
    var self = this;

    self.controller.loading(true);

    var gpio = $(e.currentTarget).data('gpio');

    $(self.el).find('.active[data-gpio="' + gpio + '"]').removeClass('active pressed');

    $(e.currentTarget).addClass('active pressed');

    self.device.wiconnect.gpio_set({args: gpio + ' ' + $(e.currentTarget).data('value')}, function(err, res) {
      self.controller.loading(false);
    });
  },

  onGPIO: function() {
    var self = this;


    var gpiosEl = self.$el.find('.gpios');

    gpiosEl.empty();

    for(var i = 0; i < self.gpios.length; i+=1) {
      var tmpl = '';
      var gpio = _.findWhere(self.device.gpio, {id: i});

      if(!gpio && !self.filter) {
        tmpl = self.templates.default({id: i});
      }

      //initialiazed gpio
      if(gpio) {
        //set current state
        gpio.state = Number(self.gpios[i]);

        tmpl = self.templates.basic(gpio);

        if(gpio.description.indexOf('GPIO') >= 0) {
          tmpl = (gpio.description.indexOf('input') >= 0) ? self.templates.gpio_input(gpio) : self.templates.gpio_output(gpio);
        }
      }

      if(tmpl.length > 0){
        $('<div />').addClass('gpio').html(tmpl).appendTo(gpiosEl);
      }
    }

    self.controller.loading(false);

  },

  getGPIO: function() {
    var self = this;

    self.device.issueCommand({cmd: 'gpios_get', args: {}}, function(err, res) {
      var gpios = res.response.replace('\r\n','');

      if(self.state !== gpios){
        self.gpios = gpios;

        self.onGPIO();
      }

      self.poll = setTimeout(self.getGPIO, 1000);
    });
  },

  render: function(){
    var self = this;

    if(this.controller.get('view') !== 'gpio'){
      $(this.el).removeClass('active');

      clearTimeout(self.poll);
      return;
    }

    self.controller.loading(true);

    this.$el.html(this.template({filter: self.filter})).addClass('active');

    self.device.wiconnect.get({args: 'gpio.usage'}, function(err, res) {

      self.device.parseGPIO(res, self.getGPIO);
    });
  }
});
