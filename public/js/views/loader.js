/*global Backbone:true, $:true, _:true, App:true */
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

App.Views.Loader = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
<div class="loading-circle loading-row1 loading-col1"></div>\
<div class="loading-circle loading-row1 loading-col2 up"></div>\
<div class="loading-circle loading-row2 loading-col2"></div>\
<div class="loading-circle loading-row2 loading-col3 up"></div>\
<div class="loading-circle loading-row3 loading-col1"></div>\
<div class="loading-circle loading-row3 loading-col2 down"></div>\
<div class="loading-circle loading-row4 loading-col1 down"></div>'),
  initialize: function(opts){
    _.bindAll(this, 'render', 'onClose');
    this.delegateEvents();
    this.render();
  },
  onClose: function(){
    this.stopListening();
  },
  events: {},
  render: function(){
    $('.loader').removeClass('initial');
    this.$el.html(this.template());
  },
});
