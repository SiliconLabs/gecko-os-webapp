/*global $:true, Backbone:true, _:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Models.Controller = Backbone.Model.extend({
  defaults: {
    loading: true,
    size: null,
    width: null,
    height: null,
    view: '',
    nav: true,
    key: null,
    queue: 0,
    retries: 3
  },
  initialize: function(opts) {
    _.bindAll(this, 'resize', 'onClose', 'loading');

    var resizer = _.debounce(this.resize, 100);
    $(window).on('resize', resizer);
    $(window).on('orientationchange', this.resize());
    $(window).on('keyup', this.onKey);

    this.cmds = [];

    this.resize();
  },
  onClose: function(){
    $(window).off('keyup', this.onKey);
  },
  resize: function(e){

    //ignore mobile keyboards triggering resize
    if(_.contains(['TEXTAREA','INPUT'], document.activeElement.tagName) && _.contains(['small', 'medium'], this.size)){
      return;
    }

    var d = document;

    var width = $(window).width();
    var height = Math.max(
      Math.max(d.body.scrollHeight, d.documentElement.scrollHeight),
      Math.max(d.body.offsetHeight, d.documentElement.offsetHeight),
      Math.max(d.body.clientHeight, d.documentElement.clientHeight)
    );
    var tray = this.get('tray');

    var size;

    if(width > 1280){
      size = 'extra';
    } else if(width > 768){
      size = 'large';
    } else if (width > 480){
      size = 'medium';
    } else {
      size = 'small';
    }

    if(_.contains(['large', 'extra'], size)) {
      $('.main').css({width: width - parseInt($('.nav').width())});
    } else {
      $('.main')
        .removeAttr('style')
        .find('>.active')
          .removeAttr('style');
    }

    if(_.contains(['large', 'extra'], size) && (height < 660)){
      size = 'medium';
      tray = false;
    }

    $('body')
      .removeClass('small medium large extra')
      .addClass(size);

    this.set({
      width: width,
      height: height,
      size: size
    });

  },
  loading: function(loading) {
    this.set({loading: loading});

    if(this.get('loading')){
      $('.loader').show();
    } else {
      $('.loader').hide();
    }
  }
});



