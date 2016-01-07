(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['locallyjs', 'backbone', 'underscore'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// CommonJS
		var Backbone = require('backbone'),
			_ = require('underscore'),
			Locally = require('locallyjs');

		module.exports = factory(Locally, Backbone, _);
	} else {
		// Browser globals
		factory(root.Locally, root.Backbone, root._);
	}
}(this, function (Locally, Backbone, _) {
	'use strict';

	// @include ../common.js

	// @include ../../tmp/backbone-jsonify.bare.js

	// @include ../backbone-repository.js
	// @include ../backbone-repository-locally.js

}));

