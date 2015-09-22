var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../lib/backbone.syncer');

var User = Backbone.Model.extend({	
	url: "http://www.example.com/"
});
var Users = Backbone.Collection.extend({	
	url: "http://www.example.com/"
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

test('Return existing model if present', function (t) {
	var a = User.create({id: 1});
	var b = User.create({id: 1});
	t.ok(a === b);
	t.end();
});

test('Set values on existing models', function (t) {
	var user = User.create({id: 1});
	User.create({id: 1, test: 'test'});
	t.is(user.get('test'), 'test');
	t.end();
});

test('Passing attributes returns model', function (t) {
  var user = User.create();
  t.ok(User.create(user.attributes) === user);
  t.end();
});

test('Add model to all during initialize', function (t) {
  var Test = Backbone.Model.extend({
    constructor: function(attrs, options) {
      var o = Backbone.Model.apply(this, arguments);
      if (o) return o;
    },
    initialize: function() {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      t.ok(Test.create({id: 1}) === this);
    }
  });
  Test.create({id: 1});
  t.end();
});

test('Use cid to identify attributes.', function (t) {
	var Model = Backbone.Model.extend();
	var model = Model.create();	
	t.same(model.toJSON(), {cid: model.cid});
	t.is(model.get('cid'), model.cid);
	t.ok(Model.create(model.attributes) === model);
	t.ok(Model.create({cid: model.cid}) === model);
	t.end();
});

test('Use cidAttribute to identify attributes.', function (t) {
	var Model = Backbone.Model.extend({cidAttribute: '_cid'});
	var model = Model.create();
	t.is(model.get('_cid'), model.cid);
	t.same(model.toJSON(), {_cid: model.cid});
	t.ok(Model.create(model.attributes) === model);
	t.ok(Model.create({_cid: model.cid}) === model);
	t.end();
});

test('Respect idAttribute.', function (t) {
	var Model = Backbone.Model.extend({idAttribute: '_id'});
	var model = Model.create({_id: 1});
	t.ok(Model.create({_id: 1}) === model);
	t.end();
});

test('Overrides and execute an initialize method properly.', function (t) {
	t.plan(3);
	var Model = Backbone.Model.extend({
		initialize: function (options) {
			this.options = options;
			t.pass();
		}
	});

	var options = {
		o1: 1
	};
	var model = Model.create({}, options);

	// Supermodel's initialize method has been executed firstly
	t.ok(model.get(model.cidAttribute) == model.cid);

	// Options has been passed as parameters through the overrided initialized method
	t.ok(model.options === options);
});

test('Fetch method on Model.', function (t) {
	t.plan(4);

	var user = User.create({
		id: 1
	});

	t.ok(!user.isFetched(), 
		"User is not fetched yet.");

	user.fetch({
		mode: "infinite",
		error: function (model, response, options) {
			options.success();
			t.ok(user.isFetched(), 
				"User has been fetched by infinite mode.");

			user.fetch({
				mode: "infinite",
				success: function (model, response, options) {
					t.pass("User has been previously fetched. No server call needed.");
				}
			});
		}
	});

	user.fetch({
		mode: "server",
		error: function (model, response, options) {
			t.pass("Server call.");
		}
	});
});

test('Save method on Model.', function (t) {
	t.plan(2);

	var user = User.create({
		id: 1
	});

	user.save({
		name: "Nacho"
	}, {
		mode: "client",
		success: function(model, response, options) {
			t.same(model.get('name'), "Nacho", "Local save.");
		}
	});

	user.save({
		name: "Nacho"
	}, {
		mode: "server",
		error: function (model, response, options) {
			t.pass("Server call.");
		}
	});
});

test('Destroy method on Model.', function (t) {
	t.plan(2);

	var user = User.create({
		id: 1
	});

	user.destroy({
		mode: "client",
		success: function (model, response, options) {
			t.pass("Local call.");
		}
	});

	user.destroy({
		mode: "server",
		error: function (model, response, options) {
			t.pass("Server call.");
		}
	});
});

test('Dirtied attributes are set.', function (t) {
	var user = User.create();

	t.same(user.dirtiedAttributes(), {});

	t.ok(!user.hasDirtied(), 
		"No dirty changes yet.");

	user.set({
		name: "Nacho"
	});

	user.set({
		age: 26
	});

	t.ok(user.hasDirtied(), 
		"Dirty changes has been set.");

	t.same(user.dirtiedAttributes(), {
		name: "Nacho",
		age: 26    
	}, "Specific dirty changes.");

	t.end();
});

test('Dirtied attributes are cleaned on server successful response.', function (t) {
	t.plan(2);

	var user = User.create({
		id: 1
	});

	user.save({
		name: "Nacho",
		surname: "Codoñer"
	}, {
		error: function (model, response, options) {
			t.same(user.dirtiedAttributes(), {
				name: "Nacho",
				surname: "Codoñer",
				age: 26
			}, "Name, surname and age are dirtied attributes.");

			model.set({
				surname: "Gil"
			});

			options.success();

			t.same(user.dirtiedAttributes(), {
				age: 26,
				surname: "Gil"
			}, "Age and surname attribute are dirtied. Name is not as it has been successfully saved.");
		}
	});

	user.set({
		age: 26
	});
});

test('Destroyed flag is set and the model is remained in local cache.', function (t) {
	t.plan(3);

	var user = User.create({
		id: 1
	});

	t.ok(!user.isDestroyed(), "User is not destroyed yet.");

	user.destroy({
		mode: "client",
		success: function (model, response, options) {
			t.ok(user.isDirtyDestroyed(), 
				"User has been marked as dirty to be destroyed.");
			t.ok(User.find(model), 
				"User is still in the local cache.");
		}
	});
});

test('A destroyed model is earsed from local cache on server successful response.', function (t) {
	t.plan(1);

	var user = User.create({
		id: 1
	});

	user.destroy({
		mode: "server",
		error: function (model, response, options) {
			options.success();

			t.ok(user.isDestroyed(), 
				"User has been destroyed.");
		}
	});
});

test('Pull method on Model.', function (t) {
	t.plan(1);

	var user = User.create({
		id: 1
	});

	user.pull({
		error: function (model, response, options) {
			options.success();

			t.ok(user.isFetched(), 
				"User is fetched.");
		}
	});
});

test('Push method on Model.', function (t) {
	t.plan(4);
	
	var user = User.create({
		name: "Nacho"
	});

	user.push({
		error: function (model, response, options) {
			options.success({
				id: 1
			});

			t.ok(!user.isNew(), 
				"User has been created remotely.");
			t.ok(!user.hasDirtied("name"), 
				"Name is no longer a dirty attribute.");

			user.set({
				surname: "Codoñer"
			});

			user.push({
				error: function (model, response, options) {
					options.success();

					t.ok(!user.hasDirtied(), 
						"User has synchronized dirtied changes.");
				}
			});

			user.trigger("destroy", user);

			user.push({
				error: function (model, response, options) {
					options.success();

					t.ok(user.isDestroyed(), 
						"User has been destroyed remotely.");
				}
			});
		}
	});
});

test('Fetch method on Collection.', function (t) {
	t.plan(2);

	var user = User.create({
		id: 1
	});

	var user2 = User.create({
		id: 2
	});

	var users = new Users([user, user2]);

	users.fetch({
		error: function (collection, response, options) {
			options.success();

			users.each(function (model) {
				t.ok(model.isFetched(), "Model is fetched.");
			});
		}
	});
});

test('Save method on Collection.', function (t) {
	t.plan(5);

	var user2 = User.create({
		id: 2,
		name: "Nacho"
	});

	var users = new Users();

	users.save([{
		name: "Jose"
	}, user2], {
		error: function (models, collection, response, options) {
			switch(options.method) {
				case "create":
					options.success([
						{id: 1}
					]);

					_.each(models, function(model) {
						t.ok(!model.isNew(), 
							"User has been created.");
					});
					break;

				case "update":
					options.success();

					_.each(models, function(model) {
						t.same(model.get("name"), "Nacho",
							"User2 has been updated.");
					});
					break;

			}
		}
	});

	users.save([{
		id: 1,
		surname: "Codoñer"
	}], {
		patch: true,
		wait: true,
		remove: false,
		error: function (models, collection, response, options) {
			switch(options.method) {
				case "patch":
					_.each(models, function(model) {
						t.ok(model.get("surname") !== "Codoñer",
							"Surname has to wait successful request to be updated.");
					});

					t.same(options.attrs, [{
						id: 1,
						surname: "Codoñer"
					}], "Only set attributes are sent.");

					options.success();

					_.each(models, function(model) {
						t.same(model.get("surname"), "Codoñer",
							"Surname has been updated.");
					});
					break;

			}
		}
	});

});

test('Destroy method on Collection.', function (t) {
	t.plan(3);

	var user = User.create({
		id: 1
	});

	var user2 = User.create({
		id: 2
	});

	var users = new Users([user, user2]);

	users.destroy({
		url: "http://www.example.com/",
		error: function (collection, response, options) {
			options.success();

			users.each(function (model) {
				t.ok(model.isDestroyed(), 
					"Model has been destroyed.");
			});
		}
	});
});

test('Pull method on Collection.', function (t) {
	t.plan(2);

	var user = User.create({
		id: 1
	});

	var user2 = User.create({
		id: 2
	});

	var users = new Users([user, user2]);

	users.pull({
		url: "http://www.example.com/",
		error: function (models, collection, response, options) {
			options.success([
				{id: 1}, {id: 2}
			]);

			users.each(function (model) {
				t.ok(model.isFetched(), 
					"Model has been fetched.");
			});
		}
	});
});

test('Push method on Collection.', function (t) {
	t.plan(3);

	var user = User.create();

	var user2 = User.create({
		id: 2,
		name: "Nacho"
	});

	var user3 = User.create({
		id: 3
	});

	var users = new Users([user, user2, user3]);

	user3.trigger("destroy");

	users.push({
		url: "http://www.example.com/",
		error: function (models, collection, response, options) {			
			switch(options.method) {
				case "create":
					options.success([
						{id: 1}
					]);

					_.each(models, function(model) {
						t.ok(!model.isNew(), 
							"User has been created.");
					});
					break;

				case "patch":
					options.success();

					_.each(models, function(model) {
						t.same(!model.hasDirtied(), 
							"User2 has synchronized dirtied changes.");
					});
					break;

				case "destroy":
					options.success();

					_.each(models, function(model) {
						t.same(model.isDestroyed(), 
							"User3 has been destroyed.");
					});
					break;

			}

		}
	});
});



