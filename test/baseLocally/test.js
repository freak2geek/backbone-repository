var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../lib/backbone.syncer.locally');

var User = Backbone.Model.extend({
	url: "http://www.example.com/user",
  versionAttribute: "version"
});

var Users = Backbone.Collection.extend({
	url: "http://www.example.com/users"
});

var test = function(name, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
    options = null;
  }
  require('tape')(name, options, function(t) {
    User.reset();
    callback(t);
  });
};