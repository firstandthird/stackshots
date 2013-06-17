module.exports = function(grunt) {
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        'lib/**/*.js',
        'bin/**/*.js'
      ]
    },
    simplemocha: {
      all: {
        src: ['test/**/*.js'],
        options : {
          ui: 'tdd',
          reporter: 'list'
        }
      }
    },
    watch: {
      test: {
        files: ['<config:lint.bin>', '<config:lint.grunt>', '<config:lint.lib>', '<config:lint.test>'],
        tasks: 'default'
      }
    }
  });
  grunt.registerTask('default', ['jshint', 'simplemocha']);
};