(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['backbone', 'underscore'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// CommonJS
		var Backbone = require('backbone'),
			_ = require('underscore');

		module.exports = factory(Backbone, _);
	} else {
		// Browser globals
		factory(root.Backbone, root._);
	}
}(this, function (Backbone, _) {
	'use strict';

	// @include ../common.js

	// @include ../../tmp/backbone-jsonify.bare.js

	// @include ../backbone-repository.js

}));

