var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../tmp/backbone.syncer.locally');

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

var test = function(name, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
    options = null;
  }
  require('tape')(name, options, function(t) {
    // Clear storage.
    Backbone.Syncer.storage().clear();
    // Clear local cache.
    User.reset();
    Admin.reset();

    callback(t);
  });
};

test('Stores a model to Storage.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1,
    name: "Nacho"
  });

  // Using storage method.
  user.storage().store();

  serialized = Backbone.Syncer.storage().get(user.storage().key());

  t.same(serialized, user.storage().serialize(),
    "Model has been sucessfully saved in storage by a storage method.");

  Backbone.Syncer.storage().clear();

  // Using manager method.
  user.save({}, {
    mode: "client",
    localStorage: true
  });

  var serialized = Backbone.Syncer.storage().get(user.storage().key());

  t.same(serialized, user.storage().serialize(),
    "Model has been sucessfully saved in storage by a model manager method.");

});

test('Removes a model from Storage.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1,
    name: "Nacho"
  });

  user.storage().store();

  // Using storage method.
  user.storage().remove();

  var serialized = Backbone.Syncer.storage().get(user.storage().key());

  t.ok(!serialized,
    "Model has been sucessfully remove from storage by a storage method.");

  user.storage().store();

  // Using manager method.
  user.destroy({
    mode: "client",
    localStorage: true
  });

  var serialized = Backbone.Syncer.storage().get(user.storage().key());

  t.ok(!serialized,
    "Model has been sucessfully remove from storage by a manager method.");

});

test('Loads a model and all its state (dirtied, changed and previous attributes, etc) from Storage.', function (t) {
  t.plan(7);

  var user = User.create({
    id: 1
  });

  user.save({
    name: "Nacho"
  }, {
    mode: "client",
    localStorage: true
  });

  user.destroy({
    mode: "client"
  });

  // Forces being fetched.
  user._fetched = true;

  // Forces being destroyed remotely.
  user._destroyed = true;

  user.storage().store();

  // Saving state values
  var attributes = _.omit(user.attributes, "cid");
  var dirtied = _.omit(user.dirtiedAttributes(), "cid");
  var dirtiedDestroyed = user.isDirtyDestroyed();
  var changed = _.omit(user.changedAttributes(), "cid");
  var previous = _.omit(user.previousAttributes(), "cid");
  var fetched = user.isFetched();
  var destroyed = user.isDestroyed();

  // Clearing state values.
  user.clearDirtied();
  user.attributes = {};
  user.changed = {};
  user._previousAttributes = {};
  user._fetched = false;
  user._destroyed = false;

  user.storage().load();

  t.same(user.attributes, attributes,
    "Attributes have been recovered rightly.");

  t.same(user.dirtiedAttributes(), dirtied,
    "Dirtied attributes have been recovered rightly.");

  t.same(user.isDirtyDestroyed(), dirtiedDestroyed,
    "Dirty destroy value has been recovered rightly.");

  t.same(user.changedAttributes(), changed,
    "Changed attributes have been recovered rightly.");

  t.same(user.previousAttributes(), previous,
    "Previous attributes have been recovered rightly.");

  t.same(user.isFetched(), fetched,
    "Fetched state has been recovered rightly.");

  t.same(user.isDestroyed(), destroyed,
    "Destroyed state has been recovered rightly.");

});

test('Saves locally and Fetches an instance from Storage.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1,
    name: "Nacho"
  });

  user.save({}, {
    mode: "client",
    localStorage: true,
    success: function (model, response, options) {
      User.all().remove(user);
      user.clearDirtied();

      user.fetch({
        mode: "client",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user),
            "Model has been loaded again from storage.");
          t.ok(user.hasDirtied("name"),
            "Model has loaded its dirtied attributtes again.");
        }
      });

    }
  });

});

test('Stores and loads a collection from Storage by storage method.', function (t) {
  t.plan(3);

  var user = User.create({
    id: 1
  });

  var user2 = User.create();

  var users = new Users([user, user2]);

  users.storage().store();

  // Clears collection.
  users.reset();

  users.storage().load();

  t.ok(users.get(user),
    "Model has been reloaded.");
  t.ok(users.get(user2),
    "Model has been reloaded.");

  t.same(User.all().length, 2,
    "Two models are still only created.");
});

test('Removes a collection from Storage by storage method.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  var user2 = User.create();

  var users = new Users([user, user2]);

  users.storage().store();

  // Clears collection.
  users.reset();

  users.storage().remove();

  users.storage().load();

  t.ok(!users.get(user),
    "Model is not longer in the collection.");
  t.ok(!users.get(user2),
    "Model is not longer in the collection.");
});

test('Set an empty collection to Storage by set method.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  var user2 = User.create();

  var users = new Users([user, user2]);

  users.storage().store();

  // Clears collection.
  users.reset();

  users.set([], {
    localStorage: true
  });

  users.storage().load();

  t.ok(!users.get(user),
    "Model is not longer in the collection.");
  t.ok(!users.get(user2),
    "Model is not longer in the collection.");
});


test('Stores and loads a collection from Storage by manager method.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  var user2 = User.create();

  var users = new Users([user, user2]);

  users.save({
    mode: "client",
    localStorage: true
  });

  // Clears collection.
  users.reset({});

  users.fetch({
    mode: "client",
    localStorage: true
  });

  t.ok(users.get(user),
    "Model has been reloaded.");
  t.ok(users.get(user2),
    "Model has been reloaded.");
});

test('Removes a collection from Storage by manager method.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  var user2 = User.create();

  var users = new Users([user, user2]);

  users.save({
    mode: "client",
    localStorage: true
  });

  // Clears collection.
  users.reset();

  users.destroy({
    mode: "client",
    localStorage: true
  });

  users.fetch({
    mode: "client",
    localStorage: true
  });

  t.ok(!users.get(user),
    "Model is not longer in the collection.");
  t.ok(!users.get(user2),
    "Model is not longer in the collection.");
});

test('Stores a collection of local models to Storage and loads them back without creating new models.', function (t) {
  t.plan(3);

  var user = User.create();

  var user2 = User.create();

  var users = new Users([user, user2]);

  users.storage().store();

  var users = new Users();

  users.storage().load();

  t.ok(users.get(user),
    "Model has been reloaded.");
  t.ok(users.get(user2),
    "Model has been reloaded.");

  t.same(User.all().length, 2,
    "Two models are still only created.");
});

test('Fetchese remotelly and then Fetches an instance from Storage.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  user.fetch({
    mode: "server",
    localStorage: true,
    success: function (model, response, options) {
      User.all().remove(user);

      // Clear fetch status.
      user._fetched = false;

      user.fetch({
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user),
            "Model has been loaded again from storage.");

          t.ok(model.isFetched(),
            "Model is marked as previously fetched.");
        },
        error: function (model, response, options) {
          t.fail();
        }
      });

    },
    error: function (model, response, options) {
      options.success();
    }
  });

});

test('Saves remotely and Fetches an instance from Storage. Wait option.', function (t) {
  t.plan(3);

  var user = User.create({
    id: 1
  });

  user.save({
    name: "Nacho"
  }, {
    mode: "server",
    localStorage: true,
    wait: true,
    success: function (model, response, options) {
      User.all().remove(user);

      user.fetch({
        mode: "client",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user),
            "Model has been loaded again from storage.");
          t.ok(!user.hasDirtied("name"),
            "Model has not dirtied attributtes.");
        }
      });

    },
    error: function (model, response, options) {
      User.all().remove(user);

      user.storage().load();

      t.ok(!User.all().get(user),
        "Model has not been loaded from the storage as wait option.");

      options.success();
    }
  });

});

test('Saves remotely and Fetches an instance from Storage. No wait option.', function (t) {
  t.plan(4);

  var user = User.create({
    id: 1
  });

  user.save({
    name: "Nacho"
  }, {
    mode: "server",
    localStorage: true,
    wait: false,
    success: function (model, response, options) {
      User.all().remove(user);

      user.fetch({
        mode: "client",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user),
            "Model has been loaded again from storage.");
          t.ok(!user.hasDirtied(),
            "Model has not dirtied attributtes.");
        }
      });

    },
    error: function (model, response, options) {
      User.all().remove(user);

      user.storage().load();

      t.ok(User.all().get(user),
        "Model has been loaded again from storage.");
      t.ok(user.hasDirtied("name"),
        "Model has dirtied attributtes.");

      options.success({
        surname: "Codoñer"
      });
    }
  });

});

test('Saves locally, Destroys locally and Fetches an instance from Storage.', function (t) {
  t.plan(1);

  var user = User.create({
    id: 1
  });

  user.save({
    name: "Nacho"
  }, {
    mode: "client",
    localStorage: true
  });

  user.destroy({
    mode: "client",
    localStorage: true,
    success: function (model, response, options) {
      User.all().remove(user);

      user.fetch({
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.fail();
        },
        error: function (model, response, options) {
          t.ok(!User.all().get(user),
            "Model has been removed from storage.");
        }
      });

    },
    error: function (model, response, options) {
      t.fail();
    }
  });

});

test('Saves locally, Destroys remotely and Fetches an instance from Storage. Wait option.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  user.save({
    name: "Nacho"
  }, {
    mode: "client",
    localStorage: true
  });

  user.destroy({
    mode: "server",
    localStorage: true,
    wait: true,
    success: function (model, response, options) {
      User.all().remove(user);

      user.fetch({
        mode: "client",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(!User.all().get(user),
            "Model has been removed from storage.");
        }
      });

    },
    error: function (model, response, options) {
      User.all().remove(user);

      user.storage().load();

      t.ok(User.all().get(user),
        "Model is still in the storage.");

      options.success();

    }
  });

});

test('Saves locally, Destroys remotely and Fetches an instance from Storage. No wait option.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  user.save({
    name: "Nacho"
  }, {
    mode: "client",
    localStorage: true
  });

  user.destroy({
    mode: "server",
    localStorage: true,
    wait: false,
    success: function (model, response, options) {
      User.all().remove(user);

      user.fetch({
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.fail();
        },
        error: function (model, response, options) {
          t.ok(!User.all().get(user),
            "Model has been removed from storage.");
        }
      });

    },
    error: function (model, response, options) {
      User.all().remove(user);

      user.fetch({
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.fail();
        },
        error: function (model, response, options) {
          t.ok(!User.all().get(user),
            "Model has been removed from storage.");
        }
      });

      options.success();
    }
  });

});

test('Saves, fetches and destroys a local model.', function (t) {
  t.plan(2);

  var user = User.create();

  user.save({
    name: "Nacho"
  }, {
    mode: "client",
    localStorage: true
  });

  User.all().remove(user);

  user.fetch({
    mode: "client",
    localStorage: true,
    success: function (model, response, options) {
      t.ok(User.all().get(user),
        "Model has been loaded again from storage.");

      user.destroy({
        mode: "client",
        localStorage: true
      });

      // Forces clear the model in the local cache.
      User.all().remove(user);

      user.fetch({
        mode: "client",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(!User.all().get(user),
            "Model has been removed from storage.");
        }
      });
    },
    error: function (model, response, options) {
      t.fail();
    }
  });

});

test('Stores and reloads local cache from Storage.', function (t) {
  t.plan(2);

  // Models are created.
  var user = User.create();
  var admin = Admin.create();

  // Saving local cache to Storage.
  User.all().storage().store();
  Admin.all().storage().store();

  // Resets local cache.
  User.all().reset();
  Admin.all().reset();

  // Reloads models from Storage.
  User.all().storage().load();

  t.ok(User.all().at(0).sid === user.sid &&
    User.all().at(0).cid !== user.cid,
    "user has been reloaded. Different cid.");

  Admin.all().storage().load();

  t.ok(Admin.all().at(0).sid === admin.sid &&
    Admin.all().at(0).cid !== admin.cid,
    "admin has been reloaded. Different cid.");
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

  user.destroy({
    mode: "client"
  });

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

  user2.destroy({
    mode: "client"
  });

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


