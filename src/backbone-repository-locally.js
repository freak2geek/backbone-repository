/* Backbone.Syncer.Locally */

_.extend(Backbone.Syncer, {
  /**
   * @property {String} [storagePrefix]
   * The prefix for using in all storages.
   */
  storagePrefix: undefined,
  /**
   * @property {Boolean} [compressStorage]
   * Wheter or not to use Locally compression by default.
   */
  compressStorage: false,
  /**
   * Gets Locally's Store object.
   */
  storage: function() {
    return Storage();
  },
  /**
   * Which keys must use for serializing model states.
   */
  serialKey: {
    attributes:           0,
    dirtiedAttributes:    1,
    dirtyDestroyed:       2,
    changes:              3,
    previousAttributes:   4,
    fetched:              5,
    destroyed:            6,
    sid:                  7
  }
});

var serialKey = Backbone.Syncer.serialKey;

/**
 * Singleton variable for Locally's Store object.
 */
var storage;

/**
 * Singleton method to get Locally's store object.
 */
var Storage = function () {
  if(!storage) {
    storage = new Locally.Store({ compress: Backbone.Syncer.compressStorage });
  }
  return storage;
};

/**
 * Hash that contains current cids for local models
 * identified by a sid (storage id).
 */
var cids = {};

/**
 * Stamps a version code to the Storage and clears in case is newer version.
 * @param {String|Number} [newVersion] the version bump.
 */
Locally.Store.prototype.setVersion = function (newVersion) {
  var store = Storage();

  var currentVersion = store.get('storageVersion');
  if (isLaterVersion(newVersion, currentVersion)) {
    store.clear();
  }
};

/**
 * Manages a model for its storage.
 *
 * @class ModelStorage
 */
var ModelStorage = function (model) {
  /**
   * @property {Backbone.Model} [model] The model associated.
   */
  this.model = model;
  this.localCache = model.constructor.register();
};

_.extend(ModelStorage.prototype, {

  /**
   * Loads a model from the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   */
  load: function (options) {
    var store = Storage();

    var key = this.key(options);
    var value = store.get(key);

    if(value) {
      this.deserialize(value, options);

      this.localCache.add(this.model);
    }
  },

  /**
   * Saves a model to the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   */
  store: function (options) {
    var store = Storage();

    if(this.model.sid && this.model.id) {
      this.remove(options);
    }

    var key = this.key(options);
    var value = this.serialize(options);

    store.set(key, value, _.extend({}, options));
  },

  /**
   * Destroys a model from the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   */
  remove: function (options) {
    var store = Storage();

    var key = this.key(options);

    store.remove(key);

    delete this.model.sid;
    delete cids[this.model.sid];
  },

  /**
   * Builds the model key for the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   * @return {String} Key generated.
   */
  key: function (options)  {
    options || (options = {});

    var storagePrefix = Backbone.Syncer.storagePrefix;
    var storeName =
      options.storeName || // by option param
      _.result(this.model, 'storeName') || // by model instance property
      _.result(this.model.constructor, 'storeName') || // by static model property
      storeNameError();

    var idModel =
      // In case there is already an internal id for the model,
      this.model.sid ||
      // if not the remote id is used,
      this.model.id ||
      // otherwise, an internal identifier is generated.
      this.sid();

    return storagePrefix+":"+
      storeName+":"+
      idModel;
  },

  /**
   * Builds the storage identification for the local model.
   * @return {String} SID (internal identifier) generated.
   */
  sid: function () {
    var sid = guid();

    this.model.sid = sid;
    cids[sid] = this.model[this.model.cidAttribute];

    return sid;
  },

  /**
   * Serializes the model information to store.
   * @return {Object} Model serialized.
   */
  serialize: function (options) {
    var serialized =  {};

    serialized[serialKey.attributes] = this.model.toJSON(_.extend({}, options, {
      cid: false
    }));
    serialized[serialKey.dirtiedAttributes] = _.omit(this.model.dirtiedAttributes(), "cid");
    serialized[serialKey.dirtyDestroyed] = this.model.isDirtyDestroyed();
    serialized[serialKey.changes] = _.omit(this.model.changedAttributes(), "cid");
    serialized[serialKey.previousAttributes] = _.omit(this.model.previousAttributes(), "cid");
    serialized[serialKey.fetched] = this.model.isFetched();
    serialized[serialKey.destroyed] = this.model.isDestroyed();

    var sid = this.model.sid;
    if (sid) {
      serialized[serialKey.sid] = sid;
    }

    return serialized;
  },

  /**
   * Deserializes the model information.
   * @param {Object} [object] The information to deserialize.
   */
  deserialize: function (serialized, options) {
    var sid = serialized[serialKey.sid];

    this.model.sid = sid;

    var attrs = serialized[serialKey.attributes];

    this.model.set(attrs, _.extend({}, options, {localStorage: false}));

    this.model.dirtied = serialized[serialKey.dirtiedAttributes];
    this.model._dirtyDestroyed = serialized[serialKey.dirtyDestroyed];
    this.model.changed = serialized[serialKey.changes];
    this.model._previousAttributes = serialized[serialKey.previousAttributes];
    this.model._fetched = serialized[serialKey.fetched];
    this.model._destroyed = serialized[serialKey.destroyed];
  }
});

/**
 * Manages a collection for its storage.
 *
 * @class CollectionStorage
 */
var CollectionStorage = function (collection) {
  /**
   * @property {Backbone.Collection} [collection] The collection associated.
   */
  this.collection = collection;
}

_.extend(CollectionStorage.prototype, {

  /**
   * Loads the entire collection from the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   */
  load: function (options) {
    var store = Storage();

    var key = this.key(options);
    var value = store.get(key);

    if(value) {
      this.deserialize(value, options);
    }
  },

  /**
   * Saves an entire collection from the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   */
  store: function (options) {
    var store = Storage();

    var key = this.key(options);
    var value = this.serialize(options);

    store.set(key, value, _.extend({}, options));

    // Stores through referenced models in the collection.
    this.collection.each(function (model) {
      try {
        var keyModel = model.storage().key();

        if(!store.get(keyModel)) {
          model.storage().store(options);
        }
      } catch (err) {}
    }, this);
  },

  /**
   * Destroys an entire collection from the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   */
  remove: function (options) {
    var store = Storage();

    var key = this.key(options);

    store.remove(key);
  },

  /**
   * Builds the collection key for the Storage.
   * @param {Object} [options] options and Locally options.
   * @param {String} [options.storeName] StoreName to use.
   * @return {String} Key generated.
   */
  key: function (options)  {
    options || (options = {});

    var storagePrefix = Backbone.Syncer.storagePrefix;
    var storeName =
      options.storeName ||
      _.result(this.collection, 'storeName') ||
      storeNameError();

    return storagePrefix+":"+storeName;
  },

  /**
   * Serializes the collection information to store.
   * @return {Object} Collection serialized.
   */
  serialize: function (options) {
    var serialized = [];

    // Goes through the collection for getting serialized data.
    this.collection.each(function (model) {
      try {
        // In case a key for the model exists, the reference is serialized in the collection data.
        serialized.push(model.storage().key());
      } catch (err) {
        // otherwise the entire model's data is serialized in the collection data.
        serialized.push(model.storage().serialize(options));
      }
    }, this);

    return serialized;
  },

  /**
   * Deserializes the collection information.
   * @param {Object} [object] The information to deserialize.
   * @return {Backbone.Collection} Collection deserialized.
   */
  deserialize: function (serialized, options) {
    var store = Storage();

    var models = [];
    // Goes through serialized data.
    for (var index in serialized) {
      var value = serialized[index];

      if (_.isString(value)) {
        // The model stored references to a new place of storage.
        var serializedModel = store.get(value);
        var sid, model;
        if ((sid = serializedModel[serialKey.sid])) {
          // The model is a local one.
          var attrs = {};

          // Checks if it has already been instantiated.
          if (cids[sid]) {
            attrs.cid = cids[sid];
          }

          model = this.collection._prepareModel(attrs,
          _.extend({}, options, {
            idAttribute: "id",
            cidAttribute: "cid"
          }));

          // Ensures it will be instantiated once.
          model.sid = sid;
          cids[sid] = model[model.cidAttribute];
        } else if (!_.isUndefined(serializedModel[serialKey.attributes].id)) {
          // The model is a remote one.
          var attrs = {};

          attrs.id = serializedModel[serialKey.attributes].id;

          model = this.collection._prepareModel(attrs,
          _.extend({}, options, {
            idAttribute: "id",
            cidAttribute: "cid"
          }));
        }

        if (!model) continue;

        // Loads the model data.
        model.storage().load();
      } else {
        // The model is stored in the serialized data of the collection.
        model = this.collection._prepareModel(value, options);
      }

      models.push(model);
    }

    // Models are loaded into the collection.
    this.collection.set(models, _.extend({}, options, {localStorage: false}));
  }

});


var prevAllModel = Backbone.Model.prototype.constructor.register;

/**
 * Extends Backbone.Model contructor to enable Locally.
 */
_.extend(Backbone.Model.prototype.constructor, {
  /**
   * @property {string} [storeName=""]
   * The keyname of the model storage.
   */
  storeName: undefined,

  register: function () {
    var register = prevAllModel.call(this);

    if(!register.storeName) {
      register.storeName = this.storeName+":register";

      register.on("update", function (model, collection, options) {
        if (options && options.localStorage) {
          this.storage().store();
        }
      }, register);
    }

    return register;
  }
});

var prevInit = Backbone.Model.prototype.initialize;
var previousSetModel = Backbone.Model.prototype.set;
var prevFetchModel = Backbone.Model.prototype.fetch;
var prevDestroyModel = Backbone.Model.prototype.destroy;
var prevPullModel = Backbone.Model.prototype.pull;

/**
 * Extends Backbone.Model to enable Locally.
 */
_.extend(Backbone.Model.prototype, {

  /**
   * @return {ModelStorage} Returns the storage manager.
   */
  storage: function() {
    return new ModelStorage(this);
  },

  /**
   * Alters `set` to enable `localStorage` option.
   */
  set: function(key, val, options) {
    if (key == null) {
      options = val;
      if (options && options.localStorage) {
        this.storage().store(options.localStorage);
      }

      return this;
    }

    var attrs;
    if (typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    var output = previousSetModel.call(this, attrs, options);

    if (options && options.localStorage) {
      this.storage().store(options.localStorage);
    }

    return output;
  },

  /**
   * Alters `fetch` to enable `localStorage` option.
   */
  fetch: function (options) {
    if (options && options.localStorage) {
      this.storage().load(options.localStorage);
    }

    return prevFetchModel.call(this, options);
  },

  /**
   * Alters `destroy` to enable `localStorage` option.
   */
  destroy: function (options) {
    var model = this;
    var success = options.success;

    var destroyFromStorage = function() {
      if (options && options.localStorage) {
        model.storage().remove(options.localStorage);
      }
    };

    var wait = options.wait;
    options.success = function(resp) {
      if (wait) destroyFromStorage();
      if (success) success.call(options.context, model, resp, options);
    };

    if (!wait) destroyFromStorage();

    return prevDestroyModel.call(this, options);
  },

  /**
   * Alters `pull` to enable `localStorage` option.
   */
  pull: function (options) {
    if (options && options.localStorage) {
      this.storage().load(options.localStorage);
    }

    return prevPullModel.call(this, options);
  }

});

var previousSetCollectionSyncer = Backbone.Collection.prototype.set;

var prevFetchCollectionSyncer = Backbone.Collection.prototype.fetch;
var prevSaveCollectionSyncer = Backbone.Collection.prototype.save;
var prevDestroyCollectionSyncer = Backbone.Collection.prototype.destroy;
var prevPullCollectionSyncer = Backbone.Collection.prototype.pull;

/**
 * Extends Backbone.Collection to enable Locally.
 */
_.extend(Backbone.Collection.prototype, {

  /**
   * @property {string} [storeName=""]
   * The keyname of the collection storage.
   */
  storeName: undefined,

  /**
   * @return {CollectionStorage} Returns the storage manager.
   */
  storage: function() {
    return new CollectionStorage(this);
  },

  /**
   * Alters `set` to enable `localStorage` option.
   */
  set: function(models, options) {
    var output = previousSetCollectionSyncer.call(this, models, options);

    if (options && options.localStorage) {
      this.storage().store(options.localStorage);
    }

    return output;
  },

  /**
   * Alters `fetch` to enable `localStorage` option.
   */
  fetch: function (options) {
    if (options && options.localStorage) {
      this.storage().load(options.localStorage);
    }

    return prevFetchCollectionSyncer.call(this, options);
  },

  /**
   * Alters `save` to enable `localStorage` option.
   */
  save: function (options) {
    if (options && options.localStorage) {
      this.storage().store(options.localStorage);
    }

    return prevSaveCollectionSyncer.call(this, options);
  },

  /**
   * Alters `destroy` to enable `localStorage` option.
   */
  destroy: function (options) {
    if (options && options.localStorage) {
      this.storage().remove(options.localStorage);
    }

    return prevDestroyCollectionSyncer.call(this, options);
  },

  /**
   * Alters `pull` to enable `localStorage` option.
   */
  pull: function (options) {
    if (options && options.localStorage) {
      this.storage().load(options.localStorage);
    }

    return prevPullCollectionSyncer.call(this, options);
  }

});

/**
 * @return {String} Generates four random hex digits.
 */
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

/**
 * @return {String} Generates a GUID.
 */
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

var storeNameError = function () {
  throw new Error('An "storeName" property or function must be specified for storage');
};

/**
 * Sync method for localstorage mode.
 */
var localstorageSync = function (method, model, options) {
  var success = options.success;
  switch(method) {
    case "create":
    case "update":
    case "patch":
      model.storage().store(options);

      if (success) {
        _.defer(success);
      }
      break;

    case "delete":
      model.storage().remove(options);

      if (success) {
        _.defer(success);
      }
      break;

    case "read":
      model.storage().load(options);

      if (success) {
        _.defer(success);
      }
      break;

  }

}

// Registers localstorage mode from the library.
Syncer.register("localStorage", localstorageSync);
