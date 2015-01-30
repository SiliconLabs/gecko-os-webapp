/*global Backbone:true, $:true, _:true, async:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.GoHACKme = Backbone.View.extend({
  els: [],
  views: [],

  reconnect: {
    content: 'Reconnecting to device...',
    attempt: 0,
    retries: 60,
    timeout: 1000,
    delay: 1000
  },

  activatedTemplate: _.template('\
<div class="content">\
<a class="ghm ghm-logo" href="https://gohack.me"></a>\
<h4>Your device is already activated.</h4>\
<h4>Go to <a href="https://gohack.me/login" target="_blank">goHACK.me</a>&nbsp;\
to monitor and control your device from the cloud.</h4>\
</div>'),

  template: _.template('\
<div class="content">\
<h1>Free Services</h1>\
<a class="ghm ghm-logo" href="https://gohack.me" target="_blank"></a>\
<h4>Create an account with <a href="http://gohack.me/signup" target="_blank">goHACK.me</a></h4>\
<h4>Activate your device with goHACK.me to start to monitor and control it from the cloud.</h4>\
<input type="text" name="email" id="ghm-email" placeholder="email@address.com">\
<input type="password" name="password" id="ghm-password" placeholder="******">\
<button class="btn btn-lg activate">Activate</button>\
</div>'),

  initialize: function(opts) {
    _.bindAll(this, 'render', 'onClose', 'onActivate', 'tryReconnect');
    this.delegateEvents();
    this.device = opts.device;
    this.controller = opts.controller;

    this.listenTo(this.controller, 'change:view', this.render);

    this.render();
  },

  events: {
    'click .activate': 'onActivate'
  },

  onClose: function() {
    this.stopListening();
  },

  render: function() {
    var self = this;

    if(this.controller.get('view') !== 'cloud'){
      $(this.el).removeClass('active');
      return;
    }

    self.controller.loading(true);

    var cmds = [
      {property: 'ghm_activated', cmd: 'get', args: {args: 'gh t'}, ret: false },
    ];

    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err) {
        if(err) {
          //handle err
        }

        self.controller.loading(false);

        var ghm_activated = Boolean(Number(self.device.get('ghm_activated').replace('\r\n','')));

        self.device.set({ghm_activated: ghm_activated});

        if(ghm_activated) {
          return self.$el.html(self.activatedTemplate()).addClass('active');
        }

        //check view still active
        if(self.controller.get('view') !== 'cloud'){
          $(self.el).removeClass('active');
          return;
        }
        self.$el.html(self.template()).addClass('active');
      });

  },

  onActivate: function() {
    var self = this;

    var email =     $(this.el).find('input[name="email"]').val();
    var password =  $(this.el).find('input[name="password"]').val();

    var cmds = [
      {cmd: 'gca', args: {args: 'download -s'}},
      {cmd: 'gac', args: {args:'\"' + email + '\" \"' + password + '\"'}}
    ];

    self.controller.modal({
      systemModal: true,
      content:'<h2>Activating device with goHACK.me service.</h2><div class="progress-bar"><div class="progress"></div></div>'
    });


    async.eachSeries(
      cmds,
      self.device.issueCommand,
      function(err) {
        if(err) {
          //handle err
        }
        self.tryReconnect();
      });
  },

  tryReconnect: function() {
    var self = this;

    setTimeout(function(){
      self.device.wiconnect.ver(
        {retries: 1, timeout: self.reconnect.timeout},
        function(err, res) {
          if(err){
            if(self.reconnect.attempt >= self.reconnect.retries){
              return self.controller.modal({content:'<h2>Unable to reconnect to device.</h2>'});
            }

            self.reconnect.attempt += 1;
            $('.progress').css({width: String((self.reconnect.attempt / self.reconnect.retries)*100) + '%'});

            return self.tryReconnect();
          }

          self.reconnect.attempt = 0;

          self.controller.modal({
            systemModal: true,
            content: 'Device now activated with goHACK.me'
          });

          setTimeout(function() {
            self.controller.closeModal();
            self.render();
          }, 3000);
        });
    }, self.reconnect.delay);

  }
});
