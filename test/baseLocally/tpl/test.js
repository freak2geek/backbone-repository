var _ = require('underscore');
var Backbone = require('backbone'),
    najax = require('najax');

Backbone.ajax = najax;

require('../../lib/<%= name %>');

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

test('Fetch remotelly and then Fetch an instance from Storage.', function (t) {
  t.plan(2);

  var user = User.create({
    id: 1
  });

  user.fetch({
    mode: "server",
    localStorage: true,
    success: function (model, response, options) {
      User.all().remove(user);

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

test('Save locally and Fetch an instance from Storage.', function (t) {
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
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user), 
            "Model has been loaded again from storage.");
          t.ok(user.hasDirtied("name"), 
            "Model has loaded its dirtied attributtes again.");
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

test('Save remotely and Fetch an instance from Storage. Wait option.', function (t) {
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
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user), 
            "Model has been loaded again from storage.");
          t.ok(!user.hasDirtied("name"), 
            "Model has not dirtied attributtes.");
        },
        error: function (model, response, options) {
          t.fail();
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
            "Model has not been loaded from the storage as wait option.");
        }
      });

      options.success();
    }
  });

});

test('Save remotely and Fetch an instance from Storage. No wait option.', function (t) {
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
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user), 
            "Model has been loaded again from storage.");
          t.ok(!user.hasDirtied(), 
            "Model has not dirtied attributtes.");
        },
        error: function (model, response, options) {
          t.fail();
        }
      });

    },
    error: function (model, response, options) {
      User.all().remove(user);

      user.fetch({
        mode: "infinite",
        localStorage: true,
        success: function (model, response, options) {
          t.ok(User.all().get(user), 
            "Model has been loaded again from storage.");
          t.ok(user.hasDirtied("name"), 
            "Model has dirtied attributtes.");
        },
        error: function (model, response, options) {          
          t.fail();
        }
      });

      options.success({
        surname: "Codoñer"
      });
    }
  });

});

test('Save locally, Destroy locally and Fetch an instance from Storage.', function (t) {
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

test('Save locally, Destroy remotely and Fetch an instance from Storage. Wait option.', function (t) {
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
          t.ok(User.all().get(user), 
            "Model is still in the storage.");
        },
        error: function (model, response, options) {
          t.fail();
        }
      });

      options.success();

    }
  });

});

test('Save locally, Destroy remotely and Fetch an instance from Storage. No wait option.', function (t) {
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