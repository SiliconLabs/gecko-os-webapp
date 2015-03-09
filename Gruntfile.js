'use strict';


module.exports = function(grunt) {

  grunt.initConfig({
    pkg: '<json:package.json>',
    jshint: {
      gui: ['public/js/*.js', 'public/js/**/*.js'],
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
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
          'out/webapp/wiconnect.css': 'public/less/*.less'
        }
      },
      css: {
        options: {
          cleancss: true,
          compress: true
        },
        files: {
          'out/webapp/wiconnect.css': 'public/css/wiconnect.css'
        }
      },
      basicDev: {
        options: {
          cleancss: false,
          compress: false
        },
        files: {
          './public/css/wiconnect.css': 'public/less/*.less'
        }
      }
    },
    jade: {
      build: {
        files: {
          './out/index.html': './public/views/index.jade',
          './out/webapp/unauthorized.html': './public/views/unauthorized.jade'
        }
      },
      basicDev: {
        options: {
          pretty: true
        },
        files: {
          './public/html/index.html': './public/views/index.jade',
          './public/html/unauthorized.html': './public/views/unauthorized.jade'
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
        mangle: true,
        compress: true,
        // options: {
        //   sourceMap: true,
        // },
        files: [{
            dest: 'out/webapp/wiconnect.js',
            src: [
                'public/vendor/jquery/dist/jquery.min.js',
                'public/vendor/underscore/underscore-min.js',
                'public/vendor/backbone/backbone.js',
                'public/vendor/async/lib/async.js',
                'public/vendor/superagent/superagent.js',
                'public/vendor/wiconnectjs/lib/main.js',
                'public/js/*.js',
                'public/js/*/*.js'
              ]
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
          'out/webapp/wiconnect.js.gz': 'out/webapp/wiconnect.js',
          'out/webapp/wiconnect.css.gz': 'out/webapp/wiconnect.css'
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
              'out/webapp/wiconnect.js.gz',
              'out/webapp/wiconnect.css.gz'
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
        files: ['public/js/*.js', 'public/js/**/*.js', 'public/vendor/wiconnect.js'],
        tasks: ['jshint', 'git-describe', 'string-replace:dev', 'uglify:build', 'compress:build'],
        options: {
          interupt: true
        }
      },
      html: {
        files: ['public/views/*.jade'],
        tasks: ['jade:build', 'compress:build'],
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
    'git-describe': {
      options: {},
      build: {}
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
      deploy: {}
    },
    http: {
      index: {options: {url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/index.html%20webapp/index.html', } },
      js: {options: {url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/wiconnect.js.gz%20webapp/wiconnect.js.gz', } },
      css: {options: {url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/wiconnect.css.gz%20webapp/wiconnect.css.gz', } },
      unauth: {options: {url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/unauthorized.html%20webapp/unauthorized.html', } },
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
          {src: 'webapp/2.1/latest/version.json'},
          {src: 'webapp/2.1/latest/index.html'},
          {src: 'webapp/2.1/latest/wiconnect.js.gz'},
          {src: 'webapp/2.1/latest/wiconnect.css.gz'},
          {src: 'webapp/2.1/latest/unauthorized.html'}
        ]
      },
      latest: {
        upload: [
          {src: 'out/index.html',               dest: 'webapp/2.1/latest/index.html'},
          {src: 'out/webapp/wiconnect.js.gz',   dest: 'webapp/2.1/latest/wiconnect.js.gz'},
          {src: 'out/webapp/wiconnect.css.gz',  dest: 'webapp/2.1/latest/wiconnect.css.gz'},
          {src: 'out/webapp/unauthorized.html', dest: 'webapp/2.1/latest/unauthorized.html'},
          {src: 'out/version.json',             dest: 'webapp/2.1/latest/version.json'}
        ]
      },
      ver: {
        upload: [
          {src: 'out/index.html',               dest: 'webapp/2.1/<%= pkg.version %>/index.html'},
          {src: 'out/webapp/wiconnect.js.gz',   dest: 'webapp/2.1/<%= pkg.version %>/wiconnect.js.gz'},
          {src: 'out/webapp/wiconnect.css.gz',  dest: 'webapp/2.1/<%= pkg.version %>/wiconnect.css.gz'},
          {src: 'out/webapp/unauthorized.html', dest: 'webapp/2.1/<%= pkg.version %>/unauthorized.html'}
        ]
      }
    },
    invalidate_cloudfront: {
      options: {
        key: '<%= aws.key %>',
        secret: '<%= aws.secret %>',
        distribution: '<%= aws.distribution %>'
      },
      release: {
        files: [
          {dest: 'webapp/2.1/latest/version.json'},
          {dest: 'webapp/2.1/latest/index.html'},
          {dest: 'webapp/2.1/latest/wiconnect.js.gz'},
          {dest: 'webapp/2.1/latest/wiconnect.css.gz'},
          {dest: 'webapp/2.1/latest/unauthorized.html'}
        ]
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-git-describe');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-tagrelease');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-htmlclean');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-http');
  grunt.loadNpmTasks('grunt-s3');
  grunt.loadNpmTasks('grunt-invalidate-cloudfront');

  grunt.event.once('git-describe', function (rev) {
    var pkg = grunt.file.readJSON('package.json');

    grunt.config.set('pkg', pkg);

    // build webapp version date & hash into complied js
    grunt.file.write(
      'public/js/version.js',
      'var _webapp = ' + '{' + 'date:"' + new Date().toISOString() + '", ' + 'hash:"' + rev.object + '", ' + 'version: "' + pkg.version +'"'+'};',
      {encoding: 'utf8'});

    // version.json for cloudfront autoupdate & metrics
    grunt.file.write(
      'out/version.json',
      '{"version": "' + pkg.version + '"}',
      {encoding: 'utf8'});
  });

  grunt.registerTask('lint', ['jshint']);

  grunt.registerTask('embed-hash', ['git-describe']);

  grunt.registerTask('build', function(type) {
    type = type ? type : '';

    if(!grunt.file.isDir('out/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/');
    }

    if(!grunt.file.isDir('out/webapp/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/webapp/');
    }

    var htmlTask = 'jade:build',
        cssTask  = 'less:build',
        hostTask = 'string-replace:deploy';

    if(grunt.file.isDir('public/html/')){
      htmlTask = 'htmlclean:build';
    }

    if(grunt.file.isDir('public/css/')){
      cssTask = 'less:css';
    }

    if(type === 'dev') {
      // set remote device host
      var config = grunt.file.readJSON('config.json');
      grunt.config.set('device.host', config.device);
      grunt.file.copy('public/js/app.js', 'public/js/.app.js');

      hostTask = 'string-replace:dev';
    }

    grunt.task.run([
      'embed-hash', 'lint', hostTask,
      'uglify:build', cssTask, htmlTask,
      'compress:build', 'buildCleanup:' + type
    ]);
  });

  grunt.registerTask('buildCleanup', function(type){
    type = type ? type : '';

    if(type === 'dev') {
      grunt.file.delete('public/js/app.js');
      grunt.file.copy('public/js/.app.js', 'public/js/app.js');
      grunt.file.delete('public/js/.app.js');
    }
  });

  grunt.registerTask('no-jade', function() {
    if(!grunt.file.isDir('public/html/')) {
      grunt.log.writeln('Created HTML directory.');
      grunt.file.mkdir('public/html/');
    }
    grunt.task.run(['jade:basicDev']);
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

    grunt.file.copy('out/index.html', 'out/webapp/index.html');

    grunt.task.run([
      'bumpup:' + type,
      'build',
      'compress:release',
      'tagrelease',
      's3:clean', 's3:latest', 's3:ver',
      'invalidate_cloudfront:release',
      'shell:pushTags'
    ]);

    grunt.file.delete('out/webapp/index.html');

    grunt.log.writeln('--------------------------------------');
    grunt.log.writeln('Ignore tagrelease deprecation message.');
    grunt.log.writeln('--------------------------------------');
  });

  grunt.registerTask('deploy', function(){
    var config = grunt.file.readJSON('config.json');

    grunt.config.set('device.host', config.device);
    grunt.config.set('local.ip', config.localIP);
    grunt.config.set('local.port', config.port);

    grunt.task.run(['build', 'http:index', 'http:js', 'http:css', 'http:unauth']);
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
};
