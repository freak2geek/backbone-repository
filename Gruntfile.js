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
				title: "Backbone.Syncer",
				name: "backbone.syncer"
			},
			baseLocally: {
				title: "Backbone.Syncer.Locally",
				name: "backbone.syncer.locally"
			},
			supermodel: {
				title: "Supermodel.Syncer",
				name: "supermodel.syncer"
			},
			supermodelLocally: {
				title: "Backbone.Syncer",
				name: "supermodel.syncer.locally"
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
			],
			supermodel: [
				'lib/<%= subpkg.supermodel.name %>.js',
				'lib/<%= subpkg.supermodel.name %>.min.js'
			],
			supermodelLocally: [
				'lib/<%= subpkg.supermodelLocally.name %>.js',
				'lib/<%= subpkg.supermodelLocally.name %>.min.js'
			],
		},
		preprocess: {
			base: {
				src: 'src/bundle/<%= subpkg.base.name %>.js',
				dest: 'tmp/<%= subpkg.base.name %>.js'
			},
			baseLocally: {
				src: 'src/bundle/<%= subpkg.baseLocally.name %>.js',
				dest: 'tmp/<%= subpkg.baseLocally.name %>.js'
			},
			supermodel: {
				src: 'src/bundle/<%= subpkg.supermodel.name %>.js',
				dest: 'tmp/<%= subpkg.supermodel.name %>.js'
			},
			supermodelLocally: {
				src: 'src/bundle/<%= subpkg.supermodelLocally.name %>.js',
				dest: 'tmp/<%= subpkg.supermodelLocally.name %>.js'
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
			},
			supermodel: {
				src: '<%= preprocess.supermodel.dest %>',
				dest: '<%= preprocess.supermodel.dest %>'
			},
			supermodelLocally: {
				src: '<%= preprocess.supermodelLocally.dest %>',
				dest: '<%= preprocess.supermodelLocally.dest %>'
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
			supermodel: {
        options: {
          banner: '/*! <%= subpkg.supermodel.name %> <%= meta.banner %>',
          stripBanners: true
        },
				src: '<%= preprocess.supermodel.dest %>',
				dest: 'lib/<%= subpkg.supermodel.name %>/<%= subpkg.supermodel.name %>.js'
			},
			supermodelLocally: {
        options: {
          banner: '/*! <%= subpkg.supermodelLocally.name %> <%= meta.banner %>',
          stripBanners: true
        },
				src: '<%= preprocess.supermodelLocally.dest %>',
				dest: 'lib/<%= subpkg.supermodelLocally.name %>/<%= subpkg.supermodelLocally.name %>.js'
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
      },
      supermodelTest: {
        files: {
          'test/supermodel/test.js': [
            'test/supermodel/tpl/header.js',
            'test/supermodel/tpl/test.js',
            'test/baseLocally/tpl/test.js',
            'test/base/tpl/test.js'
          ]
        }
      },
      supermodelLocallyTest: {
        files: {
          'test/supermodelLocally/test.js': [
            'test/supermodelLocally/tpl/header.js',
            'test/supermodelLocally/tpl/test.js',
            'test/supermodel/tpl/test.js',
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
			},
			supermodel: {
				src: '<%= concat.supermodel.dest %>',
				dest: 'lib/<%= subpkg.supermodel.name %>/<%= subpkg.supermodel.name %>.min.js'
			},
			supermodelLocally: {
				src: '<%= concat.supermodelLocally.dest %>',
				dest: 'lib/<%= subpkg.supermodelLocally.name %>/<%= subpkg.supermodelLocally.name %>.min.js'
			}
		},
		unwrap: {
			"backbone-jsonify": {
				src:	'./node_modules/backbone-jsonify/lib/backbone.jsonify.js',
				dest:	'./tmp/backbone-jsonify.bare.js'
			},
			"supermodel-jsonify": {
				src:	'./node_modules/backbone-jsonify/lib/supermodel.jsonify.js',
				dest:	'./tmp/supermodel-jsonify.bare.js'
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

	// Backbone.Syncer. Base library tasks.
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

	// Base + locally library tasks.
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

	// Supermodel.Syncer. Supermodel library tasks.
	var supermodelTasks = [
		'unwrap:supermodel-jsonify',
		'clean:supermodel',
		'preprocess:supermodel',
		'template:supermodel',
		'concat:supermodel',
		'concat:supermodelTest',
		'tape:supermodel',
		'uglify:supermodel'
	];

	grunt.registerTask('supermodel', supermodelTasks);

	// Supermodel + Locally library tasks.
	var supermodelLocallyTasks = [
		'unwrap:supermodel-jsonify',
		'clean:supermodelLocally',
		'preprocess:supermodelLocally',
		'template:supermodelLocally',
		'concat:supermodelLocally',
		'concat:supermodelLocallyTest',
		'tape:supermodelLocally',
		'uglify:supermodelLocally'
	];

	grunt.registerTask('supermodelLocally', supermodelLocallyTasks);


	// Default task.

	grunt.registerTask('default', baseTasks.concat(baseLocallyTasks).concat(supermodelTasks).concat(supermodelLocallyTasks));

	// Test task.
	grunt.registerTask('test', ['concat:baseTest', 'concat:baseLocallyTest', 'concat:supermodelTest', 'concat:supermodelLocallyTest', 'tape']);

};
