/*global $:true, Backbone:true, _:true, async:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Models.FileSystem = Backbone.Model.extend({
  defaults: {
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
      'mkdir', 'rm'
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

  mkdir: function(name, done){
    var self = this;

    if(!name) {
      return;
    }

    var cwd = self.get('cwd');

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
        newFile.name = _.last(to);

        // check file bytes loaded
        if(newFile.size !== thisFile.size){
          return done(new Error('byte mismatch'));
        }

        // rm old file
        self.rm(from.join('/'), function(err){

          // write new location
          if(to.length > 1){
            self.cd(_.initial(to), true);
          }

          self.write(
            [newFile],
            function(err){
              if(err){
                //handle err
              }

              //traverse back
              self.cd(cwd);

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

    var filepath = self.cwd().path.substring(1) + (self.cwd().path.length > 1 ? '/' :'') + _.last(path);

    self.device.wiconnect.fde({args: filepath}, function(err) {
      self.cd(cwd);
      done();
    });
  },

  read: function(fs) {
    var self = this;

    //save cwd before clearing
    var cwd = self.cwd().path;

    self.set({fs: {parent: null, path: '/', dirs: {}, files: {}}});

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

      var splitpath = _.rest(f, 7).join(' ').split('/');

      var dir = fileDir(splitpath);

      var filename = splitpath[splitpath.length - 1];

      if(filename.length === 0){
        //directory placeholder
        return;
      }

      var size = Number(f[5]);

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

  write: function(files, done) {
    var self = this;
    var cmds = [];

    var handleFile = function(commands, thisFile, next) {
      return function(e) {

        var filename = "";

        if(self.device.fs.cwd().path.length > 1) {
          //not root dir
          filename = "\"" + self.device.fs.cwd().path.substring(1) + '/' + thisFile.name + "\"";
        } else {
          filename = "\"" + thisFile.name + "\"";
        }

        if(typeof _.findWhere(self.device.fs.cwd().files, {name: filename}) !== 'undefined') {
          if(!self.overwrite) {
            return next();
          }

          commands.push({cmd: 'fde', args: {args: "\"" + filename + "\""}});
        }

        commands.push({cmd: 'fcr', args: {
          flags: 4,
          filename: filename,
          data: e.target.result,
          timeout: 30000
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
      }

      self.device.parseStreams(res, processFiles);
    });
  }
});


// enable binarytransport to read files directly to arraybuffers
// http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/
$.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
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
            dataType = options.responseType || "blob",
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