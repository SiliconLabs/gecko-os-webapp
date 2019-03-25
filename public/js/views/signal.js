/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

/*
  * Gecko OS Web App, Gecko OS JS API Library & Gecko OS JS Build System
  *
  * Copyright (C) 2019, Silicon Labs
  * All Rights Reserved.
  *
  * The Gecko OS Web App, Gecko OS JavaScript API and Gecko OS JS build system are
  * provided by Silicon Labs. The combined source code, and all derivatives, are licensed
  * by Silicon Labs SOLELY for use with devices manufactured by Silicon Labs, or hardware
  * authorized by Silicon Labs.
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

App.Views.Signal = Backbone.View.extend({
  template: _.template('\
<div class="bar <%= (strength < 1) ? "empty" : "" %> "></div>\
<div class="bar <%= (strength < 2) ? "empty" : "" %> "></div>\
<div class="bar <%= (strength < 3) ? "empty" : "" %> "></div>\
<div class="bar <%= (strength < 4) ? "empty" : "" %> "></div>\
<div class="rssi"><%- rssi %>dBm</div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose', 'setStrength');
    this.delegateEvents();

    this.rssi = opts.rssi;

    if(this.rssi > -40) {
      this.strength = 4;
    } else if (this.rssi > -55) {
      this.strength = 3;
    } else if (this.rssi > -70) {
      this.strength = 2;
    } else {
      this.strength = 1;
    }

    this.render();
  },

  onClose: function() {
    this.stopListening();
  },

  setStrength: function (strength) {
    this.strength = strength;
    this.render();
  },

  render: function() {
    this.$el.html(this.template({
      strength: this.strength,
      rssi: this.rssi
    }));
  }
});
