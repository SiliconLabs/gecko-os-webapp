"use strict";


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
      }
    },
    jade: {
      build: {
        files: {
          './out/index.html': './public/views/index.jade',
          './out/webapp/index.html': './public/views/index.jade',
          './out/webapp/unauthorized.html': './public/views/unauthorized.jade'
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
        files: {
          'out/webapp/wiconnect.js':
            [
              'public/vendor/jquery/dist/jquery.min.js',
              'public/vendor/underscore/underscore-min.js',
              'public/vendor/backbone/backbone.js',
              'public/vendor/async/lib/async.js',
              'public/vendor/superagent/superagent.js',
              'public/vendor/wiconnectjs/lib/main.js',
              'public/js/*.js',
              'public/js/*/*.js'
            ]
        }
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
        tasks: ['jshint', 'git-describe', 'uglify:build', 'compress:build'],
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
    "git-describe": {
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

  grunt.event.once('git-describe', function (rev) {
    var pkg = grunt.file.readJSON('package.json');
    grunt.file.write(
      'public/js/version.js',
      'var _webapp = '
        + '{'
          + 'date:"' + new Date().toISOString() + '", '
          + 'hash:"' + rev.object + '", '
          + 'version: "' + pkg.version +'"'
        +'};',
      {encoding: 'utf8'});
  });

  grunt.registerTask('no-jade', []); //TBC
  grunt.registerTask('no-less', []); //TBC

  grunt.registerTask('lint', ['jshint']);

  grunt.registerTask('embed-hash', ['git-describe']);

  grunt.registerTask('build', function() {

    if(!grunt.file.isDir('out/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/')
    }

    if(!grunt.file.isDir('out/webapp/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/webapp/')
    }

    grunt.task.run([
      'embed-hash', 'lint',
      'uglify:build', 'less:build', 'jade:build',
      'compress:build'
    ]);
  });

  grunt.registerTask('release', function(type) {
    type = type ? type : 'patch';

    if(!grunt.file.isDir('out/release/')) {
      grunt.log.writeln('Created release directory.');
      grunt.file.mkdir('out/release/')
    }

    grunt.task.run(['bumpup:' + type, 'build', 'compress:release', 'tagrelease', 'shell:pushTags']);

    grunt.log.writeln('--------------------------------------');
    grunt.log.writeln('Ignore tagrelease deprecation message.');
    grunt.log.writeln('--------------------------------------');
  });

  grunt.registerTask('server', 'Start express server', function() {
    require('./server.js').listen(5002, function () {
      grunt.log.writeln('Web server running at http://localhost:5002.');
    }).on('close', this.async());
  });

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });

  grunt.registerTask('default', ['build', 'server']);
}
