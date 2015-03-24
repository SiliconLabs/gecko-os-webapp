/*global Backbone:true, $:true, _:true, App:true, async:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

/*
  * WiConnect Web App, WiConnect JS API Library & WiConnect JS Build System
  *
  * Copyright (C) 2015, Sensors.com, Inc.
  * All Rights Reserved.
  *
  * The WiConnect Web App, WiConnect JavaScript API and WiConnect JS build system
  * are provided free of charge by Sensors.com. The combined source code, and
  * all derivatives, are licensed by Sensors.com SOLELY for use with devices
  * manufactured by ACKme Networks, or approved by Sensors.com.
  *
  * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS AND ANY EXPRESS OR IMPLIED
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

App.Views.Cloud = Backbone.View.extend({
  els: [],
  views: [],

  template: _.template('\
<div class="content">\
<h1>Cloud Services</h1>\
<p>ACKme modules interoperate with cloud vendors offering services for device monitoring, control and messaging. Cloud services pre-installed on this module need to be enabled by a secure activation process prior to use.</p>\
<div class="clear"></div>\
<hr>\
</div>\
<div class="content">\
<h1>Commercial Services</h1>\
<a class="sdc-logo" href="https://sensors.com" target="_blank"></a>\
<h4>The Complete Silicon-to-Cloud&trade; IoT Framework Solution</h4>\
<div class="clear"></div>\
<hr>\
</div>\
<div class="gohackme"></div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();

    this.device = opts.device;
    this.controller = opts.controller;

    this.listenTo(this.controller, 'change:view', this.render);
    this.render();
  },

  onClose: function(){
    this.stopListening();
  },

  events: {},

  render: function(){
    var self = this;

    if(this.controller.get('view') !== 'cloud'){
      $(this.el).removeClass('active');
      return;
    }
    this.$el.html(this.template()).addClass('active');

    self.gohackme = new App.Views.GoHACKme({
      el: $('.gohackme'),
      controller: self.controller,
      device: self.device
    });
  }
});
