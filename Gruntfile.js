'use strict';


module.exports = function(grunt) {

  var fs      = require('fs'),
      request = require('request'),
      async   = require('async'),
      crc     = require('./tasks/helpers/crc.js'),
      git     = require('git-rev-2');

  grunt.initConfig({
    pkg: '<json:package.json>',
    jshint: {
      gui: ['public/js/*.js', 'public/js/**/*.js'],
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true,
        esnext: true
      }
    },
    less: {
      build: {
        options: {
          cleancss: true,
          compress: true
        },
        files: {
          'out/webapp/zentrios.css': 'public/less/*.less',
          'public/views/css/recovery.css': 'public/views/less/recovery.less',
          'public/views/css/unauthorized.css': 'public/views/less/unauthorized.less',
        }
      },
      css: {
        options: {
          cleancss: true,
          compress: true
        },
        files: {
          'out/webapp/zentrios.css': 'public/css/zentrios.css'
        }
      },
      basicDev: {
        options: {
          cleancss: false,
          compress: false
        },
        files: {
          './public/css/zentrios.css': 'public/less/*.less'
        }
      }
    },
    pug: {
      build: {
        files: {
          './out/index.html': './public/views/index.pug',
          './out/webapp/index.html': './public/views/index.pug',
          './out/webapp/unauthorized.html': './public/views/unauthorized.pug',
          './out/webapp/recovery.html': './public/views/recovery.pug'
        }
      },
      basicDev: {
        options: {
          pretty: true
        },
        files: {
          './public/html/index.html': './public/views/index.pug',
          './public/html/unauthorized.html': './public/views/unauthorized.pug'
        }
      }
    },
    htmlclean: {
      build: {
        files: {
          './out/index.html': './public/html/index.html',
          './out/webapp/index.html': './public/html/index.html',
          './out/webapp/unauthorized.html': './public/html/unauthorized.html'
        }
      }
    },
    uglify: {
      build: {
        options: {
          mangle: true,
          compress: {warnings: false},
          // sourceMap: true
        },
        files: [{
            dest: 'out/webapp/zentrios.js',
            src: [
                'public/vendor/jquery/dist/jquery.min.js',
                // 'public/vendor/zepto.js/src/zepto.js',
                // 'public/vendor/zepto.js/src/event.js',
                // 'public/vendor/zepto.js/src/ajax.js',
                // 'public/vendor/zepto.js/src/ie.js',
                // 'public/vendor/zepto.js/src/callbacks.js',
                // 'public/vendor/zepto.js/src/deferred.js',
                // 'public/vendor/zepto.js/src/fx.js',
                // 'public/vendor/zepto.js/src/fx_methods.js',
                'public/vendor/underscore/underscore-min.js',
                'public/vendor/backbone/backbone.js',
                'public/vendor/async/lib/async.js',
                'public/vendor/superagent/superagent.js',
                'node_modules/geckoosjs/lib/main.js',
                'public/js/*.js',
                'public/js/*/*.js'
              ]
          },
          {
            dest: 'public/views/js/recovery.min.js',
            src: 'public/views/js/recovery.js'
          },
          {
            dest: 'public/views/js/index.min.js',
            src: 'public/views/js/index.js'
          }]
      }
    },
    compress: {
      build: {
        options: {
          mode: 'gzip',
          pretty: true,
          level: 9
        },
        expand: true,
        files: {
          'out/webapp/zentrios.js.gz': 'out/webapp/zentrios.js',
          'out/webapp/zentrios.css.gz': 'out/webapp/zentrios.css'
        }
      },
      release: {
        options: {
          archive: function () {
            var pkg = grunt.file.readJSON('package.json');
            return 'out/release/Release-' + pkg.version + '.zip';
          }
        },
        files: [
          {
            expand: true,
            src: [
              'out/webapp/index.html',
              'out/webapp/unauthorized.html',
              'out/webapp/zentrios.js.gz',
              'out/webapp/zentrios.css.gz',
              'out/webapp/version.json'
            ]
          }
        ]
      },
      official: {
        options: {
          archive: function () {
            var pkg = grunt.file.readJSON('package.json');
            return 'out/release/Release-' + pkg.version + '-official.zip';
          }
        },
        files: [
          {
            expand: true,
            src: [
              'out/webapp/index.html',
              'out/webapp/unauthorized.html',
              'out/webapp/recovery.html',
              'out/webapp/zentrios.js.gz',
              'out/webapp/zentrios.css.gz',
              'out/webapp/version.json'
            ]
          }
        ]
      }
    },
    watch: {
      wstyles: {
        files: ['public/less/*.less'],
        tasks: ['less:build', 'compress:build'],
        options: {
          interupt: true
        }
      },
      js: {
        files: ['public/js/**/*.js'],
        tasks: ['build:dev'],
        options: {
          interupt: true,
          debounceDelay: 5000
        }
      },
      html: {
        files: ['public/views/*.pug'],
        tasks: ['pug:build', 'compress:build'],
        options: {
          interupt: true
        }
      }
    },
    tagrelease: {
      file: 'package.json',
      commit:  true,
      message: 'Release %version%',
      prefix:  'v',
      annotate: false,
    },
    bumpup: {
      file: 'package.json'
    },
    shell: {
      options: {
        stdout: true,
        stderr: true
      },
      pushTags: {
        command: 'git push origin --tags'
      }
    },
    'string-replace': {
      dev: {
        files: {
          'public/js/app.js': 'public/js/app.js'
        },
        options: {
          replacements: [{
            pattern: '/*deviceHost*/',
            replacement: 'self.device.set({host: "http://<%= device.host %>"});'
          }]
        }
      },
      deploy: {},
      release: {
        files: {
          'public/views/js/index.min.js': 'public/views/js/index.min.js'
        },
        options: {
          replacements: [{
            pattern: /#\{path\}/g,
            replacement: '<%= release.path %>'
          }]
        }
      }
    },
    http: {
      commands:[
        {name: 'index', url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/index.html%20webapp/2.2.0/index.html'},
        {name: 'js',    url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/zentrios.js.gz%20webapp/2.2.0/zentrios.js.gz'},
        {name: 'css',   url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/zentrios.css.gz%20webapp/2.2.0/zentrios.css.gz'},
        {name: 'unauth',url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/unauthorized.html%20webapp/2.2.0/unauthorized.html'},
        {name: 'root',  url: 'http://<%= device.host %>/command/set%20ht%20s%20r%20webapp/index.html'},
        {name: 'denied',url: 'http://<%= device.host %>/command/set%20ht%20s%20d%20webapp/unauthorized.html'},
        {name: 'save',  url: 'http://<%= device.host %>/command/save'},
        {name: 'reboot',url: 'http://<%= device.host %>/command/reboot'}
      ]
    },
    s3: {
      options: {
        key: '<%= aws.key %>',
        secret: '<%= aws.secret %>',
        bucket: '<%= aws.bucket %>',
        access: 'public-read'
      },
      clean: {
        del: [
          {src: 'webapp/3.0/latest/version.json'},
          {src: 'webapp/3.0/latest/index.html'},
          {src: 'webapp/3.0/latest/zentrios.js.gz'},
          {src: 'webapp/3.0/latest/zentrios.css.gz'},
          {src: 'webapp/3.0/latest/unauthorized.html'}
        ]
      },
      latest: {
        upload: [
          {src: 'out/index.html',               dest: 'webapp/3.0/latest/index.html'},
          {src: 'out/webapp/zentrios.js.gz',   dest: 'webapp/3.0/latest/zentrios.js.gz'},
          {src: 'out/webapp/zentrios.css.gz',  dest: 'webapp/3.0/latest/zentrios.css.gz'},
          {src: 'out/webapp/unauthorized.html', dest: 'webapp/3.0/latest/unauthorized.html'},
          {src: 'out/webapp/version.json',      dest: 'webapp/3.0/latest/version.json'}
        ]
      },
      ver: {
        upload: [
          {src: 'out/index.html',               dest: 'webapp/3.0/<%= pkg.version %>/index.html'},
          {src: 'out/webapp/zentrios.js.gz',   dest: 'webapp/3.0/<%= pkg.version %>/zentrios.js.gz'},
          {src: 'out/webapp/zentrios.css.gz',  dest: 'webapp/3.0/<%= pkg.version %>/zentrios.css.gz'},
          {src: 'out/webapp/unauthorized.html', dest: 'webapp/3.0/<%= pkg.version %>/unauthorized.html'},
          {src: 'out/webapp/version.json',      dest: 'webapp/3.0/<%= pkg.version %>/version.json'}
        ]
      }
    },
    invalidate_cloudfront: {
      options: {
        key: '<%= aws.key %>',
        secret: '<%= aws.secret %>',
        distribution: '<%= aws.distribution %>'
      },
      latest: {
        files: [
          {dest: 'webapp/3.0/latest/version.json'},
          {dest: 'webapp/3.0/latest/index.html'},
          {dest: 'webapp/3.0/latest/zentrios.js.gz'},
          {dest: 'webapp/3.0/latest/zentrios.css.gz'},
          {dest: 'webapp/3.0/latest/unauthorized.html'}
        ]
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-pug');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-tagrelease');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-htmlclean');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-s3');
  grunt.loadNpmTasks('grunt-invalidate-cloudfront');



  grunt.registerTask('lint', ['jshint']);

  grunt.registerTask('embed-hash', function(){
    var pkg = grunt.file.readJSON('package.json');

    grunt.config.set('pkg', pkg);

    var config = grunt.file.readJSON('config.json');
    grunt.config.set('device.host', config.device);

    // build webapp version date & hash into complied js
    git.short(function(err, hash){
      if(err){
        return;
      }

      grunt.file.write(
        'public/js/version.js',
        'var _webapp = ' + '{' + 'date:"' + new Date().toISOString() + '", ' + 'hash:"' + hash + '", ' + 'version: "' + pkg.version +'"'+'};',
        {encoding: 'utf8'});

      });
  });


  grunt.registerTask('writeVersion', function(){
    var pkg = grunt.file.readJSON('package.json');

    // version.json for cloudfront autoupdate & metrics
    var ver = '{';
    ver += '"version":"' + pkg.version + '",';
    ver += '"files":[';
    ver +=    '{"name":"index.html","size":' + fs.statSync('out/index.html').size + ',"crc":"' + crc(fs.readFileSync("out/webapp/index.html")) + '"},';
    ver +=    '{"name":"zentrios.js.gz","size":' + fs.statSync('out/webapp/zentrios.js.gz').size + ',"crc":"' + crc(fs.readFileSync("out/webapp/zentrios.js.gz")) + '"},';
    ver +=    '{"name":"zentrios.css.gz","size":' + fs.statSync('out/webapp/zentrios.css.gz').size + ',"crc":"' + crc(fs.readFileSync("out/webapp/zentrios.css.gz")) + '"},';
    ver +=    '{"name":"unauthorized.html","size":' + fs.statSync('out/webapp/unauthorized.html').size + ',"crc":"' + crc(fs.readFileSync("out/webapp/unauthorized.html")) + '"}';
    ver += ']}';

    grunt.file.write(
      'out/webapp/version.json',
      ver,
      {encoding: 'utf8'});
  });

  grunt.registerTask('build', function(type) {
    type = type ? type : '';

    var pkg = grunt.file.readJSON('package.json');

    grunt.config.set('pkg', pkg);

    if(!grunt.file.isDir('out/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/');
    }

    if(!grunt.file.isDir('out/webapp/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/webapp/');
    }

    var release = {path: ''};

    if(type === 'release'){
      release = {path: pkg.version + '/'};
    }

    grunt.config.set('release', release);

    // var htmlTask = 'pug:build',
    //     cssTask  = 'less:build';

    // if(grunt.file.isDir('public/html/')){
    //   htmlTask = 'htmlclean:build';
    // }
    //
    // if(grunt.file.isDir('public/css/')){
    //   cssTask = 'less:css';
    // }

    var tasks = [];

    tasks.push('embed-hash');
    tasks.push('lint');
    tasks.push('buildCopy:' + type);

    if(type === 'dev') {
      // set remote device host
      tasks.push('string-replace:dev');
    }

    tasks.push('uglify:build');
    tasks.push('string-replace:release');
    tasks.push('less:build');
    tasks.push('pug:build');
    tasks.push('compress:build');
    tasks.push('buildCleanup:' + type);
    tasks.push('writeVersion');

    grunt.task.run(tasks);
  });

  grunt.registerTask('buildCopy', function(type){
    if(type === 'dev') {
      grunt.file.copy('public/js/app.js', 'public/js/.app.js');
    }
  });

  grunt.registerTask('buildCleanup', function(type){
    type = type ? type : '';

    if(type === 'dev') {
      grunt.file.delete('public/js/app.js');
      grunt.file.copy('public/js/.app.js', 'public/js/app.js');
      grunt.file.delete('public/js/.app.js');
    }
  });

  grunt.registerTask('no-pug', function() {
    if(!grunt.file.isDir('public/html/')) {
      grunt.log.writeln('Created HTML directory.');
      grunt.file.mkdir('public/html/');
    }
    grunt.task.run(['pug:basicDev']);
  });

  grunt.registerTask('no-less', function() {
    if(!grunt.file.isDir('public/css/')) {
      grunt.log.writeln('Created CSS directory.');
      grunt.file.mkdir('public/css/');
    }
    grunt.task.run(['less:basicDev']);
  });

  grunt.registerTask('release', function(type) {
    type = type ? type : 'patch';

    if(!grunt.file.isDir('out/release/')) {
      grunt.log.writeln('Created release directory.');
      grunt.file.mkdir('out/release/');
    }

    var aws = grunt.file.readJSON('aws.json');
    grunt.config.set('aws', aws);

    grunt.task.run([
      'bumpup:' + type,
      'build:release',
      'compress:release',
      'tagrelease',
      's3:clean', 's3:latest', 's3:ver',
      'invalidate_cloudfront:latest',
      'shell:pushTags'
    ]);

    grunt.log.writeln('--------------------------------------');
    grunt.log.writeln('Ignore tagrelease deprecation message.');
    grunt.log.writeln('--------------------------------------');
  });

  grunt.registerTask('s3force', function(){
    var pkg = grunt.file.readJSON('package.json');
    grunt.config.set('pkg', pkg);

    var aws = grunt.file.readJSON('aws.json');
    grunt.config.set('aws', aws);

    grunt.task.run([
      's3:clean', 's3:latest', 's3:ver',
      'invalidate_cloudfront:latest'
    ]);
  });


  grunt.registerTask('http', function(){
    var done = this.async();

    async.eachSeries(grunt.config('http').commands,
      function(command, next) {
        request(command.url, function(err, res){
          if(err) {
            grunt.log.writeln(command.name + ' - fail');
            grunt.log.writeln(err);
            return next(err);
          }
          grunt.log.writeln(command.name + ' - done');
          grunt.log.writeln(res.body);
          next();
        });
      }, function() {
        done();
      });
  });

  grunt.registerTask('deploy', function(){
    var pkg = grunt.file.readJSON('package.json');

    grunt.config.set('pkg', pkg);
    var config = grunt.file.readJSON('config.json');

    grunt.config.set('device.host', config.device);
    grunt.config.set('local.ip', config.localIP);
    grunt.config.set('local.port', config.port);

    grunt.task.run(['build:release', 'http']);
  });

  grunt.registerTask('server', 'Start express server', function() {
    var config = grunt.file.readJSON('config.json');

    require('./server.js').listen(config.port, function () {
      grunt.log.writeln('Web server running at http://localhost:' + config.port);
    }).on('close', this.async());
  });

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });

  grunt.registerTask('default', ['build:dev', 'server']);

  grunt.registerTask('official', function(type){
    var tasks = [];

    type = type ? type : 'patch';
    tasks.push('bumpup:' + type);

    tasks.push('embed-hash');
    tasks.push('uglify:build');

    grunt.config.set('release', {path:''});

    tasks.push('string-replace:release');

    tasks.push('less:build');
    tasks.push('pug:build');

    tasks.push('compress:build');

    tasks.push('writeVersion');

    tasks.push('compress:official');

    grunt.task.run(tasks);

  });
};
