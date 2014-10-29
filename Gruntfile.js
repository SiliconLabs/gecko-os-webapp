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
          'out/setup/wiconnect_webgui.css': 'public/less/*.less'
        }
      }
    },
    jade: {
      build: {
        files: {
          'out/index.html': 'public/views/*.jade'
        }
      }
    },
    uglify: {
      build: {
        mangle: false,
        compress: true,
        files: {
          'out/setup/wiconnect_webgui.js':
            [
              'public/vendor/jquery/dist/jquery.min.js',
              'public/vendor/underscore/underscore-min.js',
              'public/vendor/backbone/backbone.js',
              'public/vendor/async/lib/async.js',
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
          'out/setup/wiconnect_webgui.js.gz': 'out/setup/wiconnect_webgui.js',
          'out/setup/wiconnect_webgui.css.gz': 'out/setup/wiconnect_webgui.css'
        }
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
        files: ['public/js/*.js', 'public/js/**/*.js'],
        tasks: ['jshint', 'uglify:build', 'compress:build'],
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
    }
  });


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });

  grunt.registerTask('no-jade', []); //TBC
  grunt.registerTask('no-less', []); //TBC

  grunt.registerTask('lint', ['jshint']);

  grunt.registerTask('build', ['lint', 'uglify:build', 'less:build', 'jade:build', 'compress:build']);

  grunt.registerTask('server', 'Start express server', function() {
    require('./server.js').listen(5002, function () {
      grunt.log.writeln('Web server running at http://localhost:5002.');
    }).on('close', this.async());
  });

  grunt.registerTask('default', ['build', 'server']);

}
