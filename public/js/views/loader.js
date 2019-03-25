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

App.Views.Loader = Backbone.View.extend({
  els: [],
  views: [],
  template: _.template('\
<div class="path"><div class="circle"></div></div>\
<div class="path"><div class="circle"></div></div>\
<div class="path"><div class="circle"></div></div>'),
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
