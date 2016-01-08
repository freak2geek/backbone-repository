var path = require('path');
var unwrap = require('unwrap');

/*global module:false */
module.exports = function (grunt) {
	'use strict';

	// Project configuration.
	grunt.initConfig({
		// Metadata.
		pkg: grunt.file.readJSON('package.json'),
		subpkg: {
			base: {
				title: "backbone-repository",
				name: "backbone-repository"
			},
			baseLocally: {
				title: "backbone-repository-Locally",
				name: "backbone-repository-locally"
			}
		},
		meta: {
			version: '<%= pkg.version %>',
			banner: '- v<%= pkg.version %> - ' +
			'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
			'<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
			'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
			' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n' +
			'\n\n'
		},
		// Task configuration.
		bump: {
			options: {
				part: 'patch'
			},
			files: ['package.json', 'component.json']
		},
		clean: {
			base: [
				'lib/<%= subpkg.base.name %>.js',
				'lib/<%= subpkg.base.name %>.min.js'
			],
			baseLocally: [
				'lib/<%= subpkg.baseLocally.name %>.js',
				'lib/<%= subpkg.baseLocally.name %>.min.js'
			]
		},
		preprocess: {
			base: {
				src: 'src/bundle/<%= subpkg.base.name %>.js',
				dest: 'tmp/<%= subpkg.base.name %>.js'
			},
			baseLocally: {
				src: 'src/bundle/<%= subpkg.baseLocally.name %>.js',
				dest: 'tmp/<%= subpkg.baseLocally.name %>.js'
			}
		},
		template: {
			options: {
				data: {
					version: '<%= pkg.version %>'
				}
			},
			base: {
				src: '<%= preprocess.base.dest %>',
				dest: '<%= preprocess.base.dest %>'
			},
			baseLocally: {
				src: '<%= preprocess.baseLocally.dest %>',
				dest: '<%= preprocess.baseLocally.dest %>'
			}
		},
		concat: {
			base: {
        options: {
          banner: '/*! <%= subpkg.base.name %> <%= meta.banner %>',
          stripBanners: true
        },
				src: '<%= preprocess.base.dest %>',
				dest: 'lib/<%= subpkg.base.name %>/<%= subpkg.base.name %>.js'
			},
			baseLocally: {
        options: {
          banner: '/*! <%= subpkg.baseLocally.name %> <%= meta.banner %>',
          stripBanners: true
        },
				src: '<%= preprocess.baseLocally.dest %>',
				dest: 'lib/<%= subpkg.baseLocally.name %>/<%= subpkg.baseLocally.name %>.js'
			},
      baseTest: {
        files: {
          'test/base/test.js': [
            'test/base/tpl/header.js',
            'test/base/tpl/test.js'
          ]
        }
      },
      baseLocallyTest: {
        files: {
          'test/baseLocally/test.js': [
            'test/baseLocally/tpl/header.js',
            'test/baseLocally/tpl/test.js',
            'test/base/tpl/test.js'
          ]
        }
      }
		},
		tape: {
			options: {
				pretty: true,
				output: 'console'
			},
			base: ['test/base/*.js'],
			baseLocally: ['test/baseLocally/*.js'],
			supermodel: ['test/supermodel/*.js'],
			supermodelLocally: ['test/supermodelLocally/*.js']
		},
		uglify: {
			options: {
				banner: '<%= banner %>'
			},
			base: {
				src: '<%= concat.base.dest %>',
				dest: 'lib/<%= subpkg.base.name %>/<%= subpkg.base.name %>.min.js'
			},
			baseLocally: {
				src: '<%= concat.baseLocally.dest %>',
				dest: 'lib/<%= subpkg.baseLocally.name %>/<%= subpkg.baseLocally.name %>.min.js'
			}
		},
		unwrap: {
			"backbone-jsonify": {
				src:	'./node_modules/backbone-jsonify/lib/backbone.jsonify.js',
				dest:	'./tmp/backbone-jsonify.bare.js'
			}
		}
	});

	grunt.registerMultiTask('unwrap', 'Unwrap UMD', function () {
		var done = this.async();
		var timesLeft = 0;

		this.files.forEach(function (file) {
			file.src.forEach(function (src) {
				timesLeft++;
				unwrap(path.resolve(__dirname, src), function (err, content) {
					if (err) return grunt.log.error(err);
					grunt.file.write(path.resolve(__dirname, file.dest), content);
					grunt.log.ok(file.dest + ' created.');
					timesLeft--;
					if (timesLeft <= 0) done();
				});
			});
		});
	});

	// Grunt-Contrib Tasks
	Object.keys(grunt.config('pkg').devDependencies).forEach(function (dep) {
		if (/^grunt\-/i.test(dep)) {
			grunt.loadNpmTasks(dep);
		} // if
	});

	// backbone-repository. Base library tasks.
	var baseTasks = [
		'unwrap:backbone-jsonify',
		'clean:base',
		'preprocess:base',
		'template:base',
		'concat:base',
		'concat:baseTest',
		'tape:base',
		'uglify:base'
	];

	grunt.registerTask('base', baseTasks);

	// Nase + Locally library tasks.
	var baseLocallyTasks = [
		'unwrap:backbone-jsonify',
		'clean:baseLocally',
		'preprocess:baseLocally',
		'template:baseLocally',
		'concat:baseLocally',
		'concat:baseLocallyTest',
		'tape:baseLocally',
		'uglify:baseLocally'
	];

	grunt.registerTask('baseLocally', baseLocallyTasks);

	// Default task.

	grunt.registerTask('default', baseTasks.concat(baseLocallyTasks));

	// Test task.
	grunt.registerTask('test', ['concat:baseTest', 'concat:baseLocallyTest', 'tape']);

};
