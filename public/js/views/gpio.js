/*global Backbone:true, $:true, _:true, async:true, App:true */
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

App.Views.GPIO = Backbone.View.extend({
  els: [],
  views: [],
  lastState: null,
  gpios: '',
  poll: null,
  filter: true,

  template: _.template('<div class="content">\
<h1>GPIOs</h1>\
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
<div class="name"><%= alias ? alias + " - " : "" %><%= description %></div>\
<div class="state value <%= changed ? "changed": "" %>">\
<%= state ? "High" : "Low" %>\
</div>\
<div class="fade"></div>'),

    gpio_output: _.template('\
<div class="no"><%= id%> : </div>\
<div class="name"><%= alias ? alias + " - " : "" %><%= description %></div>\
<div class="btn-bar">\
<button class="btn btn-sm btn-gpio <%= !state ? "active pressed" : "" %>" data-gpio="<%= id%>" data-value="0">Low</button>\
<button class="btn btn-sm btn-gpio <%= state ? "active pressed" : "" %>" data-gpio="<%= id%>" data-value="1">High</button>\
</div>\
<div class="fade"></div>'),

    basic: _.template('\
<div class="no"><%= id%> : </div>\
<div class="name"><%= description %></div>'),

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

    self.device.geckoOS.gpio_set({args: gpio + ' ' + $(e.currentTarget).data('value')}, function(err, res) {
      self.controller.loading(false);
    });
  },

  onGPIO: function() {
    var self = this;


    var gpiosEl = self.$el.find('.gpios');

    gpiosEl.empty();

    for(var i = 0; i < self.gpios.length; i+=1) {
      var tmpl = '';
      var gpio_dir = '';
      var gpio = _.findWhere(self.device.gpio, {id: i});

      if(!gpio && !self.filter) {
        tmpl = self.templates.default({id: i});
      }

      //initialiazed gpio
      if(gpio) {
        gpio.changed = false;
        if(self.lastState){
          gpio.changed = (Number(self.lastState[i]) !== Number(self.gpios[i]));
        }

        //set current state
        gpio.state = Number(self.gpios[i]);

        tmpl = self.templates.basic(gpio);

        if(gpio.description.indexOf('GPIO') >= 0) {
          if(gpio.description.indexOf('input') >= 0) {
            tmpl = self.templates.gpio_input(gpio);
            gpio_dir = ' in';
          } else {
            tmpl = self.templates.gpio_output(gpio);
            gpio_dir = ' out';
          }
        }
      }

      if(tmpl.length > 0){
        $('<div />').addClass('gpio' + gpio_dir).html(tmpl).appendTo(gpiosEl);
      }
    }

    self.controller.loading(false);

  },

  getGPIO: function() {
    var self = this;

    self.device.issueCommand({cmd: 'gpios_get', args: {}}, function(err, res) {
      var gpios = res.response.replace('\r\n','');

      if(self.state !== gpios){
        self.lastState = self.gpios;
        self.gpios = gpios;

        self.onGPIO();
      }

      self.poll = setTimeout(self.getGPIO, 1000);
    });
  },

  render: function(){
    var self = this;

    clearTimeout(self.poll);

    if(this.controller.get('view') !== 'gpio-usage'){
      $(this.el).removeClass('active');

      return;
    }

    self.controller.loading(true);

    this.$el.html(this.template({filter: self.filter})).addClass('active');

    self.device.geckoOS.get({args: 'gpio.usage'}, function(err, res) {

      self.device.parseGPIO(res, self.getGPIO);
    });
  }
});
