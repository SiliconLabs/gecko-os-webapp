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
<h1>Zentri Device Management Service</h1>\
<p>Zentri Device Management Service instantly allows ZentriOS powered devices to be provisioned with a unique secure identity and configuration.</p>\
<p>The service is built to deliver secure, encrypted, product-specific over the air (OTA) updates to products that are in-market.</p>\
<p>A product inventory view is built into the service displaying real-time product updates including geo-location and status of the product.</p>\
<p>Visit <a href="https://www.zentri.com/products#zentri-device">Zentri Device Management Service</a> for more information.</p>\
<div class="clear"></div>\
<hr>\
</div>\
<div class="content">\
<h1>Zentri Cloud Service</h1>\
<p>Customers who go beyond secure updates and product inventory can monitor and control their product using the Cloud Connector and Zentri Cloud Service.</p>\
<p>The service additionally allows secure delivery of analytics captured from the product to the cloud.</p>\
<p>A typical customer for this service requires deployment of the service in days or weeks and relies on Zentri’s cloud infrastructure for product monitoring, control and capturing product analytics.</p>\
<p>The RESTful and WebSocket APIs that are part of the service may be used to compose operational dashboards or plug-in to existing dashboards.</p>\
<p>Visit <a href="https://www.zentri.com/products#zentri-cloud-service">Zentri Cloud Service</a> for more information.</p>\
<div class="clear"></div>\
<hr>\
</div>'),

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
    this.controller.loading(false);
  }
});
