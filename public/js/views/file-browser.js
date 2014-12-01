/*global Backbone:true, $:true, _:true, async:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */
/*jshint -W083 */

App.Views.FileBrowser = Backbone.View.extend({
  els: [],
  views: [],

  overwrite: false,

  fileTemplate: _.template('\
<div class="file <%= state %>">\
<div class="name"><%= filename %></div>\
<div class="size"><%= size %> bytes</div>\
<div class="status" data-id="<%= id %>"></div>\
</div>'),

  template: _.template('\
<div class="content">\
<h1>Files</h1>\
<div id="dropbox">Drop files here<br><span>or</span><br>\
<div class="add-btn">Click to add files<input type="file"></div>\
<div class="overwrite">\
<h4>overwrite existing files</h4>\
<div class="wiconnect-cbx secondary small">\
<input type="checkbox" value="overwrite" id="overwrite" name="overwrite" />\
<label for="overwrite"></label>\
</div>\
</div>\
</div>\
<div class="file-queue">\
<h3>Upload queue</h3>\
<div class="file uploaded">\
<div class="name">uploaded.jpg</div>\
<div class="size">12 bytes</div>\
<div class="status"></div>\
</div>\
<div class="file uploading">\
<div class="name">uploading.png</div>\
<div class="size">12 bytes</div>\
<div class="status"></div>\
</div>\
<div class="file">\
<div class="name">waiting.zip</div>\
<div class="size">12 bytes</div>\
<div class="status"></div>\
</div>\
</div>\
<div id="file-system" class="file-system"></div>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'setupEvents', 'onClose', 'onDelete',
              'onDragleave', 'onDragenter', 'onDragover', 'onDrop',
              'readFiles', 'showFiles', 'deleteFile',
              'processUploads');

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
    //drag and drop events need to be handled outside backbone to access event.dataTransfer
    'click .fs-file .status' : 'onDelete'
  },

  render: function(){
    var self = this;
    this.views = [];

    if(this.controller.get('view') !== 'browser'){
      $(this.el).removeClass('active');
      return;
    }

    this.device.files = [];

    this.$el.html(this.template()).addClass('active');
    self.controller.loading(true);

    this.setupEvents();

    this.readFiles(self.showFiles);
  },

  setupEvents: function() {
    var self = this;
    var dropbox = $(this.el).find('#dropbox')[0];

    dropbox.addEventListener('dragleave', self.onDragleave, false);
    dropbox.addEventListener('dragenter', self.onDragenter, false);
    dropbox.addEventListener('dragover',  self.onDragover,  false);
    dropbox.addEventListener('drop',      self.onDrop,      false);
  },

  readFiles: function(next, attempt) {
    var self = this;

    if(typeof attempt === 'undefined') {
      attempt = 1;
    }

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: App.device.get('host') + '/command/ls%20-v'
      })
      .fail(function() {
        if(attempt >= self.controller.get('retries')){
          return next(new Error());
        }
        self.readFiles(next, (attempt+1));
      })
      .done(function(data) {
        if(data.response){
          _.each(data.response.split('\r\n'), function(line){
            if(line.length === 0) {
              return;
            }

            line = line.replace(/\s{2,}/g, ' ').split(' '); //replace multiple spaces with a single space

            if(line[0] === '!') {
              return;
            }

            self.device.files.push({
              id: Number(line[1]),
              type: line[2],
              flags: parseInt(line[3], 16),
              size: Number(line[5]),
              version: line[6],
              filename: line[7]
            });
          });
        }

        next();
      });
  },

  showFiles: function() {
    var self = this;

    _.each(
      _.filter(self.device.files, function(file) { return file.type[0] === 'e';}), //only external flash
      function(file) {
        file.state = '';

        if((file.type.substring(2,4) === 'FE') || (file.type.substring(2,4) === '03')) { //only user files and tls certs can be deleted
          file.state = 'fs-file';
        }

        $(self.el).find('#file-system').append(self.fileTemplate(file));
      });

    self.controller.loading(false);
  },

  deleteFile: function(fileID) {
    var self = this;

    var file = _.findWhere(self.device.files, {id: fileID});

    if(typeof file === 'undefined'){
      return;
    }

    self.device.postCommand(
      {flags:0, command:'fde ' + file.filename},
      function(err) {
        if(err){
          // handle err
        }
        self.render();
      });
  },

  onDelete: function(e) {
    this.deleteFile($(e.currentTarget).data('id'));
  },

  onDragenter: function(e) {
    e.stopPropagation();
    e.preventDefault();
    $(e.target).addClass('over');
  },

  onDragleave: function(e) {
    e.stopPropagation();
    e.preventDefault();
    $(e.target).removeClass('over');
  },

  onDragover: function(e) {
    e.stopPropagation();
    e.preventDefault();
    $(e.target).addClass('over');
  },

  onDrop: function(e) {
    e.stopPropagation();
    e.preventDefault();

    this.overwrite = $($('#overwrite')[0]).is(':checked');

    $(e.target).addClass('dropped').removeClass('over').text('files added successfully');

    this.processUploads(e.dataTransfer.files);
  },

  processUploads: function(files) {
    var self = this;
    var cmds = [];

    var handleFile = function(commands, thisFile, done) {
      return function(e) {

        if(typeof _.findWhere(self.device.files, {filename: thisFile.name}) !== 'undefined') {
          if(!self.overwrite) {
            return done();
          }

          commands.push({
            flags: 0,
            command: 'fde ' + thisFile.name
          });
        }

        var bin = e.target.result;
        commands.push({
          flags: 4,
          command: 'fcr ' + thisFile.name + ' ' + e.total,
          data: btoa(bin)
        });
        return done();
      };
    };

    async.eachSeries(
      files,
      function(file, next) {
        var thisReader = new FileReader();

        thisReader.onload = handleFile(cmds, file, next);

        thisReader.readAsBinaryString(file);
      },
      function(err) {
        if(err) {
          //handle err
        }

        async.eachSeries(
          cmds,
          self.device.postCommand,
          function(err) {
            self.controller.loading(false);

            if(err) {
              //handle err
            }
            self.render();
          });

      });
  }
});
