/*global module:false */
module.exports = function (grunt) {
	'use strict';

	// Project configuration.
	grunt.initConfig({
		// Metadata.
		pkg: grunt.file.readJSON('package.json'),
		meta: {
			version: '<%= pkg.version %>',
			banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
			'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
			'<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
			'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
			' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n' +
			'\n'
		},		
		// Task configuration.
		bump: {
			options: {
				part: 'patch'
			},
			files: ['package.json', 'component.json']
		},
		clean: {
			lib: ['./lib']
		},
		preprocess: {
			bundle: {
				src: 'src/build/bundled.js',
				dest: 'tmp/<%= pkg.name %>.js'
			}
		},
		template: {
			options: {
				data: {
					version: '<%= pkg.version %>'
				}
			},
			bundle: {
				src: '<%= preprocess.bundle.dest %>',
				dest: '<%= preprocess.bundle.dest %>'
			}
		},
		concat: {
			options: {
				banner: '<%= meta.banner %>',
				stripBanners: true
			},
			lib: {
				src: '<%= preprocess.bundle.dest %>',
				dest: 'lib/<%= pkg.name %>.js'
			}
		},
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			gruntfile: {
				src: 'Gruntfile.js'
			},
			source: {
				src: ['<%= concat.lib.dest %>']
			},
			test: {
				src: ['test/**/*.js']
			}
		},
		tape: {
			options: {
				pretty: true,
				output: 'console'
			},
			files: ['test/**/*.js']
		},
		uglify: {
			options: {
				banner: '<%= banner %>'
			},
			lib: {
				src: '<%= concat.lib.dest %>',
				dest: 'lib/<%= pkg.name %>.min.js'
			}
		},
		watch: {
			gruntfile: {
				files: '<%= jshint.gruntfile.src %>',
				tasks: ['jshint:gruntfile']
			},
			source: {
				files: ['<%= concat.lib.src %>'],
				tasks: ['clean:lib', 'concat', 'jshint:source', 'jshint:test', 'qunit']
			},
			test: {
				files: ['<%= jshint.test.src %>', '<%= qunit.files %>'],
				tasks: ['jshint:test', 'qunit']
			}
		}
	});

	// Grunt-Contrib Tasks
	Object.keys(grunt.config('pkg').devDependencies).forEach(function (dep) {
		if (/^grunt\-/i.test(dep)) {
			grunt.loadNpmTasks(dep);
		} // if
	});

	// Default task.
	grunt.registerTask('default', ['clean', 'preprocess', 'template', 'concat', 'jshint', 'tape', 'uglify']);
	// Test task.
	grunt.registerTask('test', ['tape']);

};
