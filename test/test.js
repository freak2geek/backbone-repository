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

test('Fetch method on Model. Infinite mode.', function (t) {
	t.plan(3);

	var user = User.create({
		id: 1
	});

	t.ok(!user.isFetched(),
		"User is not fetched yet.");

	user.fetch({
		mode: "infinite",
    success: function (model, response, options) {
      t.ok(user.isFetched(),
        "User has been fetched by infinite mode.");

      user.fetch({
        mode: "infinite",
        success: function (model, response, options) {
          t.pass("User has been previously fetched. No server call needed.");
        }
      });
    },
		error: function (model, response, options) {
			options.success();
		}
	});

});

test('Fetch method on Model. Server mode.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  t.ok(!user.isFetched(),
    "User is not fetched yet.");

  user.fetch({
    mode: "server",
    success: function (model, response, options) {
      t.ok(user.isFetched(),
        "User has been fetched by server mode.");
    },
    error: function (model, response, options) {
      options.success();
    }
  });

});

test('Save method on Model. Client mode.', function (t) {
	t.plan(1);

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

});

test('Save method on Model. Server mode.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1
  });

  user.save({
    name: "Nacho"
  }, {
    mode: "server",
    success: function (model, response, options) {
      t.same(model.get('name'), "Nacho", "Remote save.");
    },
    error: function (model, response, options) {
      options.success();
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
    patch: true,
    success: function (model, response, options) {
      t.same(user.dirtiedAttributes(), {
        age: 26,
        surname: "Gil"
      }, "Age and surname attribute are dirtied. Name is not as it has been successfully saved.");
    },
    error: function (model, response, options) {
      t.same(user.dirtiedAttributes(), {
        name: "Nacho",
        surname: "Codoñer",
        age: 26
      }, "Name, surname and age are dirtied attributes.");

      // Surname attribute becomes dirty.
      model.set({
        surname: "Gil"
      });

      options.success();
    }
  });

  // Age attribute becomes dirty.
  user.set({
    age: 26
  });

});

test('Destroy method on Model. Client mode.', function (t) {
	t.plan(1);

	var user = User.create({
		id: 1
	});

	user.destroy({
		mode: "client",
    success: function (model, response, options) {
      t.ok(model.isDirtyDestroyed(),
        "User is destroyed locally.");
    },
    error: function (model, response, options) {
      options.success();
    }
	});

});

test('Destroy method on Model. Server mode.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1
  });

  user.destroy({
    mode: "server",
    success: function (model, response, options) {
      t.ok(model.isDestroyed(),
        "User is destroyed remotelly.");
    },
    error: function (model, response, options) {
      options.success();
    }
  });

});

test('Destroyed flag is set and the model is remained in local cache. Client mode.', function (t) {
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

test('A destroyed model is earsed from local cache on server successful response. Server mode.', function (t) {
	t.plan(2);

	var user = User.create({
		id: 1
	});

	user.destroy({
		mode: "server",
    success: function (model, response, options) {
      t.ok(user.isDestroyed(),
        "User has been destroyed.");

      t.ok(!User.find(model),
        "User is no longer in the local cache.");
    },
		error: function (model, response, options) {
			options.success();
		}
	});

});

test('Pull method on Model.', function (t) {
	t.plan(1);

	var user = User.create({
		id: 1
	});

	user.pull({
    success: function (model, response, options) {
      t.ok(user.isFetched(),
        "User is fetched.");
    },
		error: function (model, response, options) {
			options.success();
		}
	});

});

test('Push method on Model. Create case.', function (t) {
	t.plan(2);

	var user = User.create({
		name: "Nacho"
	});

	user.push({
    success: function (model, response, options) {
      t.ok(!model.isNew(),
        "User has been created remotely.");
      t.ok(!model.hasDirtied("name"),
        "Name is no longer a dirty attribute.");
    },
		error: function (model, response, options) {
			options.success({
				id: 1
			});
		}
	});

});

test('Push method on Model. Update case.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 2,
    name: "Nacho",
    surname: "Codoñer"
  });

  user.push({
    success: function (model, response, options) {
      t.ok(!model.hasDirtied(),
        "User has synchronized dirtied changes.");
    },
    error: function (model, response, options) {
      options.success();
    }
  });

});

test('Push method on Model. Destroy case.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1,
    name: "Nacho"
  });

  user.trigger("destroy", user);

  user.push({
    success: function (model, response, options) {
      t.ok(model.isDestroyed(),
        "User has been destroyed remotely.");
    },
    error: function (model, response, options) {
      options.success();
    }
  });

  var user2 = User.create();

  user2.trigger("destroy", user2);

  user2.push({
    error: function (model, response, options) {
      t.fail("No method has to be sent.");
    }
  });

});



