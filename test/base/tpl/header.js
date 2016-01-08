var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../tmp/backbone-repository');

var User = Backbone.Model.extend({
  url: "http://www.example.com/user",
  versionAttribute: "version",
  checkUrl: "http://www.example.com/user/check"
});

var Admin = Backbone.Model.extend({
  url: "http://www.example.com/admin"
});

var Users = Backbone.Collection.extend({
  url: "http://www.example.com/users",
  checkUrl: "http://www.example.com/users/check"
});
