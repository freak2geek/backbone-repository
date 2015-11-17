var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../tmp/<%= name %>');

Backbone.Syncer.storagePrefix = "Test";

var User = Backbone.Model.extend({
	url: "http://www.example.com/user",
  versionAttribute: "version"
}, {
  storeName: "User"
});

var Users = Backbone.Collection.extend({
	url: "http://www.example.com/users",
  storeName: "Users",
  model: function (attrs, options) {
    return User.create(attrs, options);
  }
});

var Admin = Backbone.Model.extend({
  url: "http://www.example.com/admin"
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
  var dirtied = user.dirtiedAttributes();
  var dirtiedDestroyed = user.isDirtyDestroyed();
  var changed = user.changedAttributes();
  var previous = user.previousAttributes();
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