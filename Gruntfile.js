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
			baseTest: {
				options: {
					data: {
						name: '<%= subpkg.base.name %>'
					}
				},
				files: {
					'test/base/test.js': ['test/base/tpl/test.js']
				}
			},
			baseLocally: {
				src: '<%= preprocess.baseLocally.dest %>',
				dest: '<%= preprocess.baseLocally.dest %>'
			},
			baseLocallyTest: {
				options: {
					data: {
						name: '<%= subpkg.baseLocally.name %>'
					}
				},
				files: {
					'test/baseLocally/testBase.js': ['test/base/tpl/test.js'],
					'test/baseLocally/test.js': ['test/baseLocally/tpl/test.js']
				}
			},
			supermodel: {
				src: '<%= preprocess.supermodel.dest %>',
				dest: '<%= preprocess.supermodel.dest %>'
			},
			supermodelTest: {
				options: {
					data: {
						name: '<%= subpkg.supermodel.name %>'
					}
				},
				files: {
					'test/supermodel/testBase.js': ['test/base/tpl/test.js'],
					'test/supermodel/test.js': ['test/supermodel/tpl/test.js']
				}
			},
			supermodelLocally: {
				src: '<%= preprocess.supermodelLocally.dest %>',
				dest: '<%= preprocess.supermodelLocally.dest %>'
			},
			supermodelLocallyTest: {
				options: {
					data: {
						name: '<%= subpkg.supermodelLocally.name %>'
					}
				},
				files: {
					'test/supermodelLocally/testBase.js': ['test/base/tpl/test.js'],
					'test/supermodelLocally/testBaseLocally.js': ['test/baseLocally/tpl/test.js'],
					'test/supermodelLocally/testSupermodel.js': ['test/supermodel/tpl/test.js'],
					'test/supermodelLocally/test.js': ['test/supermodelLocally/tpl/test.js']
				}
			}
		},
		concat: {
			options: {
				banner: '<%= meta.banner %>',
				stripBanners: true
			},
			base: {
				src: '<%= preprocess.base.dest %>',
				dest: 'lib/<%= subpkg.base.name %>.js'
			},
			baseLocally: {
				src: '<%= preprocess.base.dest %>',
				dest: 'lib/<%= subpkg.baseLocally.name %>.js'
			},
			supermodel: {
				src: '<%= preprocess.base.dest %>',
				dest: 'lib/<%= subpkg.supermodel.name %>.js'
			},
			supermodelLocally: {
				src: '<%= preprocess.base.dest %>',
				dest: 'lib/<%= subpkg.supermodelLocally.name %>.js'
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
				dest: 'lib/<%= subpkg.base.name %>.min.js'
			},
			baseLocally: {
				src: '<%= concat.baseLocally.dest %>',
				dest: 'lib/<%= subpkg.baseLocally.name %>.min.js'
			},
			supermodel: {
				src: '<%= concat.supermodel.dest %>',
				dest: 'lib/<%= subpkg.supermodel.name %>.min.js'
			},
			supermodelLocally: {
				src: '<%= concat.supermodelLocally.dest %>',
				dest: 'lib/<%= subpkg.supermodelLocally.name %>.min.js'
			}
		},
		unwrap: {
			"backbone.jsonify": {
				src:	'./node_modules/backbone.jsonify/lib/backbone.jsonify.js',
				dest:	'./tmp/backbone.jsonify.bare.js'
			},			
			"supermodel.jsonify": {
				src:	'./node_modules/backbone.jsonify/lib/supermodel.jsonify.js',
				dest:	'./tmp/supermodel.jsonify.bare.js'
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
		'unwrap:backbone.jsonify',
		'clean:base',
		'preprocess:base',
		'template:base',
		'concat:base',
		'template:baseTest',
		'tape:base',
		'uglify:base'
	];

	grunt.registerTask('base', baseTasks);

	// Base + locally library tasks.
	var baseLocallyTasks = [
		'unwrap:backbone.jsonify',
		'clean:baseLocally',
		'preprocess:baseLocally',
		'template:baseLocally',
		'concat:baseLocally',
		'template:baseLocallyTest',
		'tape:baseLocally',
		'uglify:baseLocally'
	];

	grunt.registerTask('baseLocally', baseTasks.concat(baseLocallyTasks));

	// Supermodel.Syncer. Supermodel library tasks.
	var supermodelTasks = [
		'unwrap:supermodel.jsonify',
		'clean:supermodel',
		'preprocess:supermodel',
		'template:supermodel',
		'concat:supermodel',
		'template:supermodelTest',
		'tape:supermodel',
		'uglify:supermodel'
	];

	grunt.registerTask('supermodel', baseTasks.concat(baseLocallyTasks).concat(supermodelTasks));

	// Supermodel + Locally library tasks.
	var supermodelLocallyTasks = [
		'unwrap:supermodel.jsonify',
		'clean:supermodelLocally',
		'preprocess:supermodelLocally',
		'template:supermodelLocally',
		'concat:supermodelLocally',
		'template:supermodelLocallyTest',
		'tape:supermodelLocally',
		'uglify:supermodelLocally'
	];

	grunt.registerTask('supermodelLocally', baseTasks.concat(baseLocallyTasks).concat(supermodelTasks).concat(supermodelLocallyTasks));


	// Default task.

	grunt.registerTask('default', baseTasks.concat(baseLocallyTasks).concat(supermodelTasks).concat(supermodelLocallyTasks));
	
	// Test task.
	grunt.registerTask('test', ['template:baseTest', 'template:baseLocallyTest', 'template:supermodelTest', 'template:supermodelLocallyTest', 'tape']);

};
