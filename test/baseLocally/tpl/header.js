var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../tmp/backbone-repository-locally');

Backbone.Syncer.storagePrefix = "Test";

var User = Backbone.Model.extend({
  url: "http://www.example.com/user",
  versionAttribute: "version"
}, {
  storeName: "User"
});

var Admin = Backbone.Model.extend({
  url: "http://www.example.com/admin"
}, {
  storeName: "Admin"
});

var Users = Backbone.Collection.extend({
  url: "http://www.example.com/users",
  storeName: "Users",
  model: function (attrs, options) {
    return User.create(attrs, options);
  }
});
