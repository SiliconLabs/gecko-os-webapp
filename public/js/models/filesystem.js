/*global $:true, Backbone:true, _:true, async:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

/*
  * Zentri Web App, Zentri JS API Library & Zentri JS Build System
  *
  * Copyright (C) 2015, Sensors.com, Inc.
  * All Rights Reserved.
  *
  * The Zentri Web App, Zentri JavaScript API and Zentri JS build system
  * are provided by Zentri. The combined source code, and all derivatives, are licensed
  * by Zentri SOLELY for use with devices manufactured by Zentri, or hardware
  * authorized by Zentri.
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

App.Models.FileSystem = Backbone.Model.extend({
  defaults: {
    loaded: false,
    cwd: null,
    fs: {
      parent: null,
      path:   '/',
      dirs:   {},
      files:  {}
    }
  },
  initialize: function(opts) {
    var self = this;

    _.bindAll(this,
      'read', 'write', 'cwd',
      'cd', 'mv',
      'mkdir', 'rm',
      'objectCount'
    );

    self.device = opts.device;

    self.set({cwd: self.get('fs')});
  },

  cwd: function() {
    return this.get('cwd');
  },

  cd: function(path, build) {
    var self = this;

    path = path || [''];
    build = build || false;

    if(typeof path === 'string'){
      path = path.split('/');
    }

    switch(path[0]){
      case '':
        self.set({cwd: self.get('fs')});
        break;
      case '..':
        if(self.get('cwd').parent){
          self.set({cwd: self.get('cwd').parent});
        }
        break;
      default:
        var dir = self.cwd().dirs[path[0]];

        if(!dir && build) {
          dir = self.cwd().dirs[path[0]] = {
            name: path[0],
            parent: self.cwd(),
            path: (self.cwd().path.length > 1 ? self.cwd().path : '') + '/' + path[0],
            dirs: {},
            files: {}
          };
        }

        if(dir){
          self.set({cwd: dir});
        }
    }

    if(path.length > 1) {
      return this.cd(_.rest(path), build);
    }

    return this.get('cwd');
  },

  mkdir: function(path, done){
    var self = this;

    if(!path) {
      return;
    }

    var cwd = self.get('cwd').path;

    path = path.split('/');
    var name = _.last(path);

    if(path.length > 1) {
      self.cd(_.initial(path));
    }

    if(name.slice(-1) !== '/') {
      name = name + '/';
    }

    var dir = new Blob(['#']);
    dir.name = name;

    self.write(
      [dir],
      function(err) {
        if(err){
          //handle err
        }

        self.cd(cwd);

        if(typeof done === 'function'){
          done();
        }
      });

  },

  mv: function(from, to, done, attempt) {
    attempt = attempt || 1;

    if(!from || !to){
      return;
    }

    //dont move directory placeholders
    if(from.slice(-1) === '/') {
      return;
    }

    from = from.split('/');

    var self = this;
    var thisFile, newFile;
    var cwd = self.get('cwd').path;
    thisFile = self.get('cwd').files[_.last(from)];

    //file location
    self.cd(_.initial(from));

    // get file

    var fileUrl;

    fileUrl = (self.device.get('host').slice(-1) === '/') ? self.device.get('host').substring(0, (self.device.get('host').length - 2)) : self.device.get('host');
    fileUrl += self.get('cwd').path + ((self.get('cwd').path.length > 1) ? '/' : '');
    fileUrl += _.last(from);

    $.ajax({
        url: fileUrl,
        dataType: 'binary',
        processData: false
      })
      .fail(function(){
        if(attempt > 3){
          return done(new Error());
        }

        self.mv(from, to, done, attempt+1);
      })
      .done(function(res) {

        to = to.split('/');

        newFile = res;
        newFile.name = (_.last(to) === '') ? _.last(from) : _.last(to); //keep same filename if none supplied

        // check file bytes loaded
        if(newFile.size !== thisFile.size){
          return done(new Error('byte mismatch'));
        }

        // write new location
        if(to.length > 1){
          self.cd(_.initial(to), true);
        }

        // rm old file
        self.write(
          [newFile],
          function(err){
            if(err){
              //handle err
            }

            //traverse back
            self.cd(cwd);

            self.rm(self.cwd().path.substring(1) + (self.cwd().path.length > 1 ? '/' :'') + _.last(from), function(err){
              if(err){
                //handle err
              }

              done();
            });
        });
      });
  },

  rm: function(path, done) {
    var self = this;
    var cwd = self.cwd().path;

    path = path.split('/');

    if(path.length > 1){
      self.cd(_.initial(path));
    }

    if(_.initial(path).length > 0){
      if(self.cwd().path.substr(self.cwd().path.length - _.initial(path).join('/').length).indexOf(_.initial(path).join('/')) === -1){
        //path does not exist
        return done();
      }
    }

    var filepath = '\"' + self.cwd().path.substring(1) + (self.cwd().path.length > 1 ? '/' :'') + _.last(path) + '\"';

    self.device.wiconnect.fde({args: filepath}, function() {
      self.cd(cwd);
      done();
    });
  },

  read: function(fs) {
    var self = this;

    //save cwd before clearing
    var cwd = self.cwd().path;

    self.set({loaded: true, fs: {parent: null, path: '/', dirs: {}, files: {}}});

    var fileDir = function(splitpath, dir) {
      dir = dir || self.get('fs');

      if(splitpath.length > 1){
        var dirname = splitpath[0];

        if(!dir.dirs[dirname]) {
          dir.dirs[dirname] = {
            name: dirname,
            parent: dir,
            path: (dir.path.length > 1 ? dir.path : '') + '/' + dirname,
            dirs: {},
            files: {}
          };
        }

        return fileDir(_.rest(splitpath), dir.dirs[dirname]);
      }

      return dir;
    };

    _.each(fs, function(f){
      if(f.length === 0) {
        return;
      }

      f = f.replace(/\s{2,}/g, ' ').split(' '); //replace multiple spaces with a single space

      if(f[0] === '!') {
        return;
      }

      var size = Number(f[5]);

      // 'this     is my/dumb/directory/////path.avi'
      // => 'this is my/dumb/directory/path.avi'
      // => ['this is my', 'dumb', 'directory', 'path.avi']
      var splitpath = _.rest(f, 7).join(' ').replace(/\/{2,}/g, '/').split('/');

      var filename = _.last(splitpath);

      if(splitpath[0] === '') {
        //invalid directory OR file - leading /
        return;
      }

      if(filename.length === 0 && size > 1){
        //invalid directory placeholder OR filename with trailing /
        return;
      }

      var dir = fileDir(splitpath);

      if(filename.length === 0){
        //directory placeholder - no file to add
        return;
      }

      dir.files[filename] = {
        name: filename,
        id: Number(f[1]),
        type: f[2],
        flags: parseInt(f[3], 16),
        size: size,
        version: f[6]
      };
    });

    //traverse back
    self.cd(cwd);
  },

  write: function(files, opts, done) {
    if(typeof opts === 'function'){
      done = opts;
      opts = {};
    }

    if(typeof done !== 'function'){
      done = function(){};
    }

    var self = this;
    var cmds = [];

    var handleFile = function(commands, thisFile, next) {
      return function(e) {

        var filename = '';

        if(self.device.fs.cwd().path.length > 1) {
          //not root dir
          filename = '\"' + self.device.fs.cwd().path.substring(1) + '/' + thisFile.name + '\"';
        } else {
          filename = '\"' + thisFile.name +  '\"';
        }

        if(typeof _.findWhere(self.device.fs.cwd().files, {name: thisFile.name}) !== 'undefined') {
          if(!opts.overwrite) {
            return next();
          }

          commands.push({cmd: 'fde', args: {args: filename}});
        }

        commands.push({cmd: 'fcr', args: {
          flags: 4,
          filename: filename,
          data: e.target.result,
          timeout: 30000,
          acceptCommandFailed: false
        }});

        return next();
      };
    };


    var processFiles = function() {
      async.eachSeries(
        files,
        function(file, next) {

          var filename;

          if(self.device.fs.cwd().path.length > 1) {
            filename = self.device.fs.cwd().path.substring(1) + '/' + file.name;
          } else {
            filename = file.name;
          }

          //if stream for this file already exists close it
          var openStream = _.filter(self.device.streams, function(stream) {return stream.info.indexOf(filename + '-1.0.0.0') >= 0;})[0];
          if(openStream) {
            cmds.push({cmd: 'close', args: {args: openStream.id, flags: 0}});
          }

          var thisReader = new FileReader();

          thisReader.onload = handleFile(cmds, file, next);

          thisReader.readAsArrayBuffer(file);
        },
        function(err) {
          if(err) {
            //handle err
          }

          async.eachSeries(
            cmds,
            self.device.issueCommand,
            done
          );
        });
    };

    self.device.wiconnect.list(function(err, res){
      if(err){
        //handle err
        return done(err);
      }

      self.device.parseStreams(res, processFiles);
    });
  },

  objectCount: function(dir) {
    var self = this;

    var count = 0;

    count = Object.keys(dir.files).length;
    count += Object.keys(dir.dirs).length;

    _.each(Object.keys(dir.dirs), function(d) {
      count += self.objectCount(dir.dirs[d]);
    });

    return count;
  }
});


// enable binarytransport to read files directly to arraybuffers
// http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/
$.ajaxTransport('+binary', function(options, originalOptions, jqXHR){
  // check for conditions and support for blob / arraybuffer response type
  if (window.FormData && ((options.dataType && (options.dataType === 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob))))) {
    return {
      // create new XMLHttpRequest
      send: function(headers, callback){
        // setup all variables
        var xhr = new XMLHttpRequest(),
            url = options.url,
            type = options.type,
            async = options.async || true,
            // blob or arraybuffer. Default is blob
            dataType = options.responseType || 'blob',
            data = options.data || null,
            username = options.username || null,
            password = options.password || null;

        xhr.addEventListener('load', function(){
          var data = {};
          data[options.dataType] = xhr.response;
          // make callback and send data
          callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
        });

        xhr.open(type, url, async, username, password);

        // setup custom headers
        for (var i in headers ) {
          xhr.setRequestHeader(i, headers[i] );
        }

        xhr.responseType = dataType;
        xhr.send(data);
      },
      abort: function(){
        jqXHR.abort();
      }
    };
  }
});
