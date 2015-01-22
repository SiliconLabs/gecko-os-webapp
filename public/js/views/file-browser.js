/*global Backbone:true, $:true, _:true, async:true, App:true, WiConnectDevice: true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */
/*jshint -W083 */

App.Views.FileBrowser = Backbone.View.extend({
  els: [],
  views: [],

  overwrite: false,

  fileTemplate: _.template('\
<div class="file <%= state %>" data-queue="<%= id %>">\
<div class="name">\
<%= (state === "fs-file") ? "<a href=\'" + filename.split(" ").join("%20") + "\' data-bypass target="_blank">" + filename + "</a>" : filename %>\
</div>\
<div class="size"><%= size %> bytes</div>\
<div class="status" data-id="<%= id %>"></div>\
</div>'),

  template: _.template('\
<div class="content">\
<h1>Files</h1>\
<div id="dropbox">Drop files here<br><span>or</span><br>\
<div class="add-btn">Click to add files<input type="file" multiple="multiple" name="file-select" class="file-select"></div>\
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
</div>\
<div id="file-system" class="file-system"></div>\
</div>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'setupEvents', 'onClose', 'onDelete',
              'onDragleave', 'onDragenter', 'onDragover', 'onDrop',
              'readFiles', 'showFiles',
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
    'click .fs-file .status' : 'onDelete',
    'change .file-select' : 'onFile'
  },

  render: function(){
    var self = this;
    this.views = [];

    if(this.controller.get('view') !== 'browser'){
      $(this.el).removeClass('active');
      return;
    }

    this.device.files = [];

    //draw blank
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

    var done = function(err, res) {
      if(res.response){
        _.each(res.response.split('\r\n'), function(line){
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
            filename: _.rest(line, 7).join(' ')
          });
        });
      }

      next();
    };

    self.device.wiconnect.ls({args: '-v'}, done);
  },

  showFiles: function() {
    var self = this;

    _.each(
      _.filter(self.device.files, function(file) { return file.type[0] !== 'i';}), //not internal flash
      function(file) {
        file.state = '';

        if((file.type.substring(2,4) === 'FE') || (file.type.substring(2,4) === '03')) { //only user files and tls certs can be deleted
          file.state = 'fs-file';
        }

        $(self.el).find('#file-system').append(self.fileTemplate(file));
      });

    self.controller.loading(false);
  },

  onDelete: function(e) {
    // this.deleteFile($(e.currentTarget).data('id'));
    //
    this.deleteModal = new App.Views.DeleteModal({
      fileID: $(e.currentTarget).data('id'),
      device: this.device,
      controller: this.controller,
      el: $('<div />')
        .addClass('confirm-delete modal')
        .appendTo(this.$el)
    });
    this.deleteModal.on('modalDelete', this.modalDelete, this);
    this.deleteModal.on('modalCancel', this.modalCancel, this);
  },

  modalDelete: function() {
    this.modalCancel();
    this.render();
  },

  modalCancel: function() {
    this.deleteModal.stopListening();
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

    $(e.target).addClass('dropped').removeClass('over').text('uploading files');

    this.processUploads(e.dataTransfer.files);
  },

  onFile: function(e) {
    e.stopPropagation();
    e.preventDefault();

    this.overwrite = $($('#overwrite')[0]).is(':checked');

    this.processUploads(e.currentTarget.files);
  },

  processUploads: function(files) {
    var self = this;
    var cmds = [];

    self.controller.loading(true);

    var handleFile = function(commands, thisFile, done) {
      return function(e) {

        if(typeof _.findWhere(self.device.files, {filename: thisFile.name}) !== 'undefined') {
          if(!self.overwrite) {
            return done();
          }

          commands.push({cmd: 'fde', args: {args: "\"" + thisFile.name + "\""}});
        }

        commands.push({cmd: 'fcr', args: {
          flags: 4,
          filename: "\"" + thisFile.name + "\"",
          data: e.target.result,
          timeout: 30000
        }});

        return done();
      };
    };


    var processFiles = function() {
      async.eachSeries(
        files,
        function(file, next) {

          var thisFile = {
            id: 0,
            state: 'uploading',
            filename: file.name,
            size: file.size
          };

          //if stream for this file already exists close it
          var openStream = _.filter(self.device.streams, function(stream) {return stream.info.indexOf(thisFile.filename + '-1.0.0.0') >= 0;})[0];
          if(openStream) {
            cmds.push({cmd: 'close', args: {args: openStream.id, flags: 0}});
          }

          $(self.el).find('.file-queue').append(self.fileTemplate(thisFile));

          var thisReader = new FileReader();

          thisReader.onload = handleFile(cmds, file, next);

          thisReader.readAsArrayBuffer(file);
        },
        function(err) {
          if(err) {
            //handle err
          }
          $(self.el).find('.file-queue').slideDown('fast');

          async.eachSeries(
            cmds,
            self.device.issueCommand,
            function(err, res) {
              self.controller.loading(false);

              if(err) {
                //handle err
              }
              self.render();
            });

        });
    };

    self.device.wiconnect.list(function(err, res){
      if(err){
        //handle err
      }

      self.device.parseStreams(res, processFiles);
    });

  }
});



App.Views.DeleteModal = Backbone.View.extend({
  template: _.template('\
<div class="content">\
<h2>Are you sure you want to delete "<%= filename%>"?</h2>\
<div>\
<button class="btn btn-lg cancel">Cancel</button>\
<button class="btn btn-lg delete">Delete</button>\
</div>\
<div class="clear"></div>\
</div>'),
  initialize: function(opts) {
    _.bindAll(this,
              'render', 'onClose',
              'onCancel', 'onDelete');

    var self = this;

    this.fileID = opts.fileID;
    this.device = opts.device;
    this.controller = opts.controller;

    this.file = _.findWhere(self.device.files, {id: self.fileID});

    this.render();
  },

  onClose: function() {
    this.stopListening();
  },

  events: {
    'click .cancel': 'onCancel',
    'click .delete': 'onDelete'
  },

  onCancel: function() {
    this.trigger('modalCancel');
    this.remove();
  },

  onDelete: function() {
    this.deleteFile();
  },

  deleteFile: function() {
    var self = this;

    if(typeof self.file === 'undefined'){
      self.onCancel();
    }

    self.controller.loading(true);
    self.remove();

    self.device.wiconnect.fde(
      {args: self.file.filename, flags: 0},
      function(err) {
        if(err){
          // handle err
        }
        self.controller.loading(false);
        self.trigger('modalDelete');
      });

  },

  render: function() {
    var self = this;

    this.$el.html(this.template({filename: self.file.filename}));
  }
});


