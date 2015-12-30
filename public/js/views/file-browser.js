/*global Backbone:true, $:true, _:true, async:true, App:true, _webapp:true*/
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */
/*jshint -W083 */

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

App.Views.FileBrowser = Backbone.View.extend({
  els: [],
  views: [],

  overwrite: false,

  folderTemplate: _.template('\
<div class="folder" data-cd="<%= name %>">\
<div class="icon">\
</div>\
<div class="name">\
<%= name %>\
</div>\
<div class="size"><%= info %></div>\
</div>'),

  fileTemplate: _.template('\
<div class="file <%= state %>" data-id="<%= id %>">\
<div class="name">\
<%= link ? "<a href=\'" + url.split(" ").join("%20") + "\' data-bypass target=\'_blank\'>" + name + "</a>" : name %>\
</div>\
<div class="size"><%= size %></div>\
<div class="status" data-id="<%= id %>"></div>\
<div class="fade"></div>\
</div>'),

  template: _.template('\
<div class="content">\
<h1>Files</h1>\
<div class="path"></div>\
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
    _.bindAll(this, 'render', 'setupEvents', 'onClose', 'onDelete', 'deleteFile',
              'onDragleave', 'onDragenter', 'onDragover', 'onDrop', 'onRightClick',
              'readFiles', 'showDir', 'onFolder',
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
    'click .deletable .status' : 'onDelete',
    'click .file-system .folder': 'onFolder',
    'change .file-select' : 'onFileSelect',
    'contextmenu .file-system .file': 'onRightClick',
    'contextmenu .file-system .folder': 'onRightClick',
    'contextmenu .content': 'onRightClick',
    'click .fs-file': 'onFileClick'
  },

  onRightClick: function(e) {
    var self = this;
    if(self.fileContext){
      self.fileContext.close();
    }

    var t = e.clientY,
        r = 'auto',
        b = 'auto',
        l = e.clientX;

    var thisFile = null,
        thisDir = null;

    if(_.contains(e.currentTarget.classList, 'fs-file')){
      thisFile = _.find(self.device.fs.cwd().files, function(f){ return f.id === $(e.currentTarget).data('id');});
    }

    if(_.contains(e.currentTarget.classList, 'folder')){
      thisDir = self.device.fs.cwd().dirs[$(e.currentTarget).data('cd').toString()];
    }

    self.fileContext = new App.Views.FileContext({
      el: $('<div />')
            .addClass('fileContext')
            .css({top: t, right: r, bottom: b, left: l})
            .appendTo(self.$el),
      controller: self.controller,
      device: self.device,
      browser: self,
      file: thisFile,
      dir: thisDir
    });

    return false;
  },

  render: function(){
    var self = this;
    this.views = [];

    if(this.controller.get('view') !== 'browser'){
      $(this.el).removeClass('active');
      return;
    }

    //draw blank
    this.$el.html(this.template()).addClass('active');
    self.controller.loading(true);

    this.setupEvents();

    this.readFiles(self.showDir);
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
        self.device.fs.read(res.response.split('\r\n'));
      }

      next();
    };

    self.device.wiconnect.ls({args: '-v'}, done);
  },

  showDir: function(dir) {
    var self = this;
    self.$('.path').text((self.device.fs.cwd().path.length) > 1 ? self.device.fs.cwd().path : '');
    self.$('#file-system').empty();

    dir = dir || self.device.fs.cwd();

    if(dir && dir.parent){
      $(self.el).find('#file-system').append(self.folderTemplate({
        name: '..',
        info: dir.parent.path
      }));
    }

    _.each(
      _.filter(Object.keys(dir.dirs), function(foldername) {
        return (foldername[0] !== '.');
      }),
      function(folder){
        var fldr = {
          name: folder,
          info: Object.keys(dir.dirs[folder].files).length + ' file' + (Object.keys(dir.dirs[folder].files).length !== 1 ? 's' : '')
        };

        $(self.el).find('#file-system').append(self.folderTemplate(fldr));
      });

    //JSON.parse(JSON.stringify()) - equiv of copying object
    var dirfiles = JSON.parse(JSON.stringify(dir.files));

    _.each(
      _.filter(Object.keys(dirfiles), function(filename) {
        return (filename[0] !== '.') && (filename[filename.length] !== '/') && (dir.files[filename].type[0] !== 'i');
      }), //not internal flash, hidden, directory
      function(filename) {
        var file = dirfiles[filename];
        file.name = filename;
        file.state = [];
        file.link = false;

        if(!_.contains(['00','01','81'], file.type.substring(2,4))){ //FW-791
          file.state = ['fs-file','deletable'];
        }

        // do not let web app delete itself
        if(_.contains(['/webapp', '/webapp/' + _webapp.version], self.device.fs.cwd().path)) {
          if(_.contains(['index.html', 'zentrios.js.gz', 'zentrios.css.gz', 'unauthorized.html'], file.name)){
            file.state = _.without(file.state, 'deletable');
          }
        }

        if(!(file.flags & 0x1A)) { //FW-791
          file.link = true;

          file.url = (self.device.get('host').slice(-1) === '/') ? self.device.get('host').substring(0, (self.device.get('host').length - 2)) : self.device.get('host');
          file.url += self.device.fs.cwd().path + ((self.device.fs.cwd().path.length > 1) ? '/' : '');
          file.url += file.name;
        }

        if(_.contains(['small', 'medium'], self.controller.get('size'))) {
          file.size = (file.size/1024).toFixed(1) + 'K';
        } else {
          file.size = file.size + ' bytes';
        }

        file.state = file.state.join(' ');

        $(self.el).find('#file-system').append(self.fileTemplate(file));
      });

    self.controller.loading(false);
  },

  onFolder: function(e) {
    e.preventDefault();

    this.showDir(this.device.fs.cd($(e.currentTarget).data('cd').toString()));
  },

  onDelete: function(e) {
    var self = this;

    var filename;

    _.each(Object.keys(self.device.fs.cwd().files), function(f){
      if(self.device.fs.cwd().files[f].id === $(e.currentTarget).data('id')){
        filename = f;
      }
    });

    self.deleteFile(filename);
  },

  deleteFile: function(filename) {
    var self = this;

    self.controller.modal({
      content: '<h2>Are you sure you want to delete "' + filename + '"?</h2>',
      systemModal: true,
      showClose: false,
      primaryBtn: {
        content: 'Delete',
        class: 'delete',
        clickFn: function(modal) {
          self.controller.loading(true);

          if(self.device.fs.cwd().path.length > 1) {
            //not root dir
            filename = self.device.fs.cwd().path.substring(1) + '/' + filename;
          }

          self.device.fs.rm(
            filename,
            function(err) {
              if(err){
                // handle err
              }
              modal.onClose();
              self.controller.loading(false);
              self.render();
            });

        }
      },
      secondaryBtn: {
        content: 'Cancel',
        class: 'cancel'
      }
    });
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

    this.processUploads(e.dataTransfer.files);
  },

  onFileSelect: function(e) {
    e.stopPropagation();
    e.preventDefault();

    this.processUploads(e.currentTarget.files);
  },

  processUploads: function(files) {
    var self = this;

    this.overwrite = $($('#overwrite')[0]).is(':checked');
    $('#dropbox').addClass('dropped').removeClass('over').text('uploading files');

    self.controller.loading(true);

    async.eachSeries(
      files,
      function(file, next) {
        var thisFile = {
          id: 0,
          state: 'uploading',
          link: '',
          name: file.name,
          size: file.size
        };
        $(self.el).find('.file-queue').append(self.fileTemplate(thisFile));
        next();
      },
      function() {
        $(self.el).find('.file-queue').slideDown('fast');

        self.device.fs.write(files, {overwrite: self.overwrite}, function(err){
          self.controller.loading(false);

          if(err) {
            //handle err
            self.controller.modal({
              systemModal: false,
              content: '<h2>Error uploading file.</h2>',
              primaryBtn: {
                content: 'Continue'
              },
              showClose: true
            });
          }

          self.render();
        });
      });
  }
});



App.Views.FileContext = Backbone.View.extend({
  els: [],
  views: [],

  template: _.template('\
<ul>\
<li class="hr mkdir">New Folder</li>\
<li class="<%= link ? "" : "disabled" %> save"><% if(link) { %><a href="<%= url %>" data-bypass target="_blank">Save</a><% }else{ %>Save<% } %></li>\
<li class="<%= isFile ? "" : "disabled" %> mv">Rename</li>\
<li class="<%= isFile || isEmpty ? "" : "disabled" %> rm">Delete</li>\
</ul>'),

  initialize: function(opts){
    _.bindAll(this, 'render', 'close', 'onClick',
      'onMkdir', 'onMv', 'onRm');
    this.delegateEvents();

    this.controller = opts.controller;
    this.device = opts.device;
    this.browser = opts.browser;
    this.file = opts.file;
    this.dir = opts.dir;

    this.render();

    this.listenTo(this.controller, 'change:width', this.close);
    this.listenTo(this.controller, 'change:height', this.close);

    document.addEventListener('click', this.onClick, false);
  },

  events: {
    'click .mkdir': 'onMkdir',
    'click .mv:not(.disabled)': 'onMv',
    'click .rm:not(.disabled)': 'onRm',
    'click .save:not(.disabled)': 'onSave'
  },

  onClick: function() {
    document.removeEventListener('click', this.onClick, false);
    this.close();
  },

  close: function(){
    this.undelegateEvents();
    this.$el.removeData().unbind();
    this.remove();
    Backbone.View.prototype.remove.call(this);
  },

  render: function(){
    var self = this;

    var data = {
      isFile: !_.isNull(self.file),
      isEmpty: (self.dir ? self.device.fs.objectCount(self.dir) : -1) === 0,
      link: false,
      url: ''
    };

    if(!_.isNull(self.file) && !(self.file.flags & 0x1A)) { //FW-791
      data.link = true;

      data.url = (self.device.get('host').slice(-1) === '/') ? self.device.get('host').substring(0, (self.device.get('host').length - 2)) : self.device.get('host');
      data.url += self.device.fs.cwd().path + ((self.device.fs.cwd().path.length > 1) ? '/' : '');
      data.url += self.file.name;
    }

    self.$el.html(self.template(data));
  },

  onMkdir: function() {
    var self = this;

    self.controller.modal({
      systemModal: false,
      content: '<label>Folder name:</label><input autofocus="autofocus"></input>',
      primaryBtn: {
        content: 'Save',
        clickFn: function(modal) {
          self.controller.loading(true);
          self.controller.closeModal();

          self.device.fs.mkdir(modal.$('input').val().replace(/\/{2,}/g,'/').replace(/\/$/, ''), function(){
            self.controller.loading(false);
            self.browser.render();
          });
        }
      },
      secondaryBtn: {
        content: 'Cancel',
        class: 'cancel'
      }
    });
  },

  onMv: function() {
    var self = this;

    self.controller.modal({
      systemModal: false,
      content: '<label>New file name:</label><input autofocus="autofocus"></input>',
      primaryBtn: {
        content: 'Rename',
        clickFn: function(modal) {
          self.controller.loading(true);
          self.controller.closeModal();

          self.device.fs.mv(self.file.name, modal.$('input').val().replace(/\/{2,}/g,'/').replace(/\/$/, ''), function() {
            self.controller.loading(false);
            self.browser.render();
          });
        }
      },
      secondaryBtn: {
        content: 'Cancel',
        class: 'cancel'
      }
    });
  },

  onRm: function() {
    var name = this.dir ? this.dir.name + '/' : this.file.name;
    this.browser.deleteFile(name);
  }
});
