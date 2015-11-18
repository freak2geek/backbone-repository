var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../tmp/backbone.syncer.locally');

var User = Backbone.Model.extend({
	url: "http://www.example.com/user",
  versionAttribute: "version"
});
var Admin = User.extend({}, {parent: User});

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
    Admin.reset();
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

test('Add instances to inheritance chain', function(t) {
  var a = Admin.create({id: 1});
  var b = User.create({id: 1});
  t.ok(a === b);
  t.end();
});

test('Instantiating an existing object as a subclass throws.', function(t) {
  var admin;
  var user = User.create({id: 1});
  t.throws(function() {
    admin = Admin.create({id: 1});
  }, function(e) {
    return e.message === 'Model with id "1" already exists.';
  });
  t.ok(!Admin.all().include(admin));
  t.ok(User.all().include(user));
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

test('Fetch methods does not affect version attribute. Server mode.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1,
    version: 1
  });

  user.fetch({
    mode: "server",
    success: function (model, response, options) {
      t.ok(user.isFetched(),
        "User has not been modified its fetch status.");
    },
    error: function (model, response, options) {
      options.success({
        version: 2
      });
    }
  });

});

test('Fetch method is forced to affect version attribute. Server mode.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });
  user._fetched = true;

  t.ok(user.isFetched(),
        "User is fetched.");

  user.fetch({
    mode: "server",
    version: true,
    success: function (model, response, options) {
      t.ok(!user.isFetched(),
        "User is no longer fetched as a new version has been set.");
    },
    error: function (model, response, options) {
      options.success({
        version: 1
      });
    }
  });

});

test('Save and set method do not affect version attribute.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1,
    version: 1
  });
  user._fetched = true;

  user.set({
    version: 2
  });

  t.ok(user.isFetched(),
    "User is still fetched.");

  user.save({
    version: 3
  }, {
    mode: "client",
    success: function (model, response, options) {
      t.ok(user.isFetched(),
        "User is still fetched.");
    }
  });

});

test('Save and set method affect version attribute.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1,
    version: 1
  });
  user._fetched = true;

  user.set({
    version: 2
  }, {
    version: true
  });

  t.ok(!user.isFetched(),
    "User is no longer fetched as a new version has been set.");

  user._fetched = true;

  user.save({
    version: 3
  }, {
    mode: "client",
    version: true,
    success: function (model, response, options) {
      t.ok(!user.isFetched(),
        "User is no longer fetched as a new version has been set.");
    }
  });

});

test('Save method does not affect version attribute. Server mode.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1,
    name: "Nacho",
    version: 1
  });
  user._fetched = true;

  user.save({}, {
    mode: "server",
    success: function (model, response, options) {
      t.ok(user.isFetched(),
        "User has not been modified its fetch status.");
    },
    error: function (model, response, options) {
      options.success({
        version: 2
      });
    }
  });

});

test('Save method is forced to affect version attribute. Server mode.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1,
    name: "Nacho",
    version: 1
  });
  user._fetched = true;

  user.save({}, {
    mode: "server",
    version: true,
    success: function (model, response, options) {
      t.ok(!user.isFetched(),
        "User is no longer fetched as a new version has been set.");
    },
    error: function (model, response, options) {
      options.success({
        version: 2
      });
    }
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

test('Fetch method on Collection. Infinite mode.', function (t) {
  t.plan(7);

  // Model to fetch
  var user = User.create({
    id: 1
  });

  // Model to fetch
  var user2 = User.create({
    id: 2
  });

  // Model to keep
  var user3 = User.create();


  // Fetched model
  var user4 = User.create({
    id: 4
  });
  user4._fetched = true;

  var users = new Users([user, user2, user3, user4]);

  t.ok(!user.isFetched(), "Model is not fetched.");
  t.ok(!user2.isFetched(), "Model is not fetched.");

  users.fetch({
    mode: "infinite",
    success: function (collection, response, options) {
      t.same(options.url, collection.url+"/1;2", "The list of ids to fetch is set correctly at the url.");

      t.ok(collection.get(1).isFetched(), "Model is fetched.");
      t.ok(collection.get(2).isFetched(), "Model is fetched.");

      t.ok(!_.isUndefined(collection.get(user3)), "Local model is kept in the collection.");
      t.ok(!_.isUndefined(collection.get(user4)), "Fetched model is kept in the collection.");
    },
    error: function (collection, response, options) {
      options.success([
        {id: 1},
        {id: 2}
      ]);
    }
  });

});

test('Fetch method on Collection. Server mode.', function (t) {
  t.plan(6);

  // Model to fetch
  var user = User.create({
    id: 1
  });

  // Model to fetch
  var user2 = User.create({
    id: 2
  });

  // Model to keep
  var user3 = User.create();

  // Fetched model
  var user4 = User.create({
    id: 4
  });
  user4._fetched = true;

  var users = new Users([user, user2, user3, user4]);

  t.ok(!user.isFetched(), "Model is not fetched.");
  t.ok(!user2.isFetched(), "Model is not fetched.");

  users.fetch({
    success: function (collection, response, options) {
      t.ok(collection.get(1).isFetched(), "Model is fetched.");
      t.ok(collection.get(2).isFetched(), "Model is fetched.");
      t.ok(collection.get(4).isFetched(), "Model is fetched.");

      t.ok(!_.isUndefined(collection.get(user3)), "Local model is kept in the collection.");
    },
    error: function (collection, response, options) {
      options.success([
        {id: 1},
        {id: 2},
        {id: 4}
      ]);
    }
  });

});

test('Fetch methods does not affect version attribute. Collection case. Server mode.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1,
    version: 1
  });

  var users = new Users([user]);

  users.fetch({
    success: function (collection, response, options) {
      t.ok(user.isFetched(),
        "User has not been modified its fetch status.");
    },
    error: function (collection, response, options) {
      options.success([{
        id: 1,
        version: 2
      }]);
    }
  });

});

test('Fetch method is forced to affect version attribute. Collection case. Server mode.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1,
    version: 1
  });
  user._fetched = true;

  var users = new Users([user]);

  t.ok(user.isFetched(),
        "User is fetched.");

  user.fetch({
    version: true,
    success: function (collection, response, options) {
      t.ok(!user.isFetched(),
        "User is no longer fetched as a new version has been set.");
    },
    error: function (collection, response, options) {
      options.success({
        id: 1,
        version: 2
      });
    }
  });

});

test('Save method on Collection. Server mode.', function (t) {
  t.plan(2);

  // Remote model
  var user = User.create({
    id: 1
  });

  // Local model
  var user2 = User.create();

  var users = new Users([user, user2]);

  users.save({
    success: function (model, response, options) {
      if (model === user) {
        t.ok(!model.hasDirtied(), "User has been updated and it has no dirtied attributes.");
      } else if (model === user2)  {
        t.ok(!model.isNew(), "User2 has been created.");
      }
    },
    error: function (model, response, options) {
      if (model.isNew()) {
        options.success({
          id: 2
        });
      } else {
        options.success();
      }
    }
  });

});

test('Destroy method on Collection. Server mode.', function (t) {
  t.plan(2);

  // Remote model
  var user = User.create({
    id: 1
  });

  // Local model
  var user2 = User.create();

  var users = new Users([user, user2]);

  users.destroy({
    success: function (model, response, options) {
      t.pass();
    },
    error: function (model, response, options) {
      options.success();
    }
  });

});

test('Pull method on Collection.', function (t) {
  t.plan(2);

  // Model to fetch
  var user = User.create({
    id: 1
  });

  var users = new Users([user]);

  t.ok(!user.isFetched(), "Model is not fetched.");

  users.pull({
    success: function (collection, response, options) {
      t.ok(collection.get(1).isFetched(), "Model is fetched.");
    },
    error: function (collection, response, options) {
      options.success([
        {id: 1}
      ]);
    }
  });

});

test('Push method on Collection.', function (t) {
  t.plan(3);

  // Model to create
  var user = User.create();

  // Model to update
  var user2 = User.create({
    id: 2,
    name: "Nacho"
  });

  // Model to destroy
  var user3 = User.create({
    id: 3
  });

  user3.destroy({
    mode: "client"
  });

  var users = new Users([user, user2, user3]);

  users.push({
    success: function (model, response, options) {
      if (model === user) {
        t.ok(!model.isNew(), "User has been created.");
      } else if (model === user2) {
        t.ok(!model.hasDirtied(), "User2 has no dirtied attributes.");
      }  else if (model === user3) {
        t.ok(model.isDestroyed(), "User3 has been destroyed.");
      }
    },
    error: function (model, response, options) {
      if (model === user) {
        options.success({
          id: 1
        });
      } else {
        options.success();
      }
    }
  });

});


