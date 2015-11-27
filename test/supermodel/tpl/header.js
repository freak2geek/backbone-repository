var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../tmp/supermodel.syncer');

var User = Backbone.Model.extend({
	url: "http://www.example.com/user",
  versionAttribute: "version"
});

var Users = Backbone.Collection.extend({
	url: "http://www.example.com/users"
});
