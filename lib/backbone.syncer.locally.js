/*! backbone.syncer - v0.1.0 - 2015-11-18
* Copyright (c) 2015 Nacho Codoñer; Licensed MIT */


(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['locallyjs', 'backbone', 'underscore'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// CommonJS
		var Backbone = require('backbone'),
			_ = require('underscore'),
			Locally = require('locallyjs');

		module.exports = factory(Locally, Backbone, _);
	} else {
		// Browser globals
		factory(root.Locally, root.Backbone, root._);
	}
}(this, function (Locally, Backbone, _) {
	'use strict';

	Backbone.Syncer = {	
		serverSync: Backbone.sync,
		IDS_URL_SEPARATOR: "/",
		IDS_SEPARATOR: ";",
		VERSION:  '0.1.0'
	};

	/*! backbone.jsonify - v0.2.0 - 2015-10-25
	* Copyright (c) 2015 Nacho Codoñer; Licensed MIT */ (function(Backbone, _) {
	  "use strict";
	  Backbone.Jsonify = {};
	  Backbone.Jsonify.VERSION = "0.2.0";
	  Backbone.Jsonify.exToJSON = Backbone.Model.prototype.toJSON;
	  var serializeDeeper = function(object, deepJson) {
	    _.each(object, function(value, key) {
	      if (value instanceof Backbone.Model || value instanceof Backbone.Collection) {
	        object[key] = value.toJSON({
	          deepJson: deepJson
	        });
	      } else if (_.isObject(value) && deepJson) {
	        object[key] = serializeDeeper(_.clone(value), deepJson);
	      }
	    });
	    return object;
	  };
	  Backbone.Model.prototype.exToJSON = Backbone.Jsonify.exToJSON;
	  Backbone.Model.prototype.toJSON = _.wrap(Backbone.Jsonify.exToJSON, function(exToJSON) {
	    var options = arguments[1];
	    options || (options = {});
	    var output;
	    if (_.isBoolean(options.omit) && options.omit || _.isBoolean(options.pick) && !options.pick) {
	      // When 'true' omit, or 'false' pick
	      return {};
	    } else if (_.isBoolean(options.pick) && options.pick || _.isBoolean(options.omit) && !options.omit) {
	      // When 'true' pick, or 'false' omit
	      output = exToJSON.call(this, options);
	    } else if (options.pick) {
	      // `pick` logic
	      output = _.pick(this.attributes, options.pick);
	    } else if (options.omit) {
	      // `omit` logic
	      output = _.omit(this.attributes, options.omit);
	    } else {
	      output = exToJSON.call(this, options);
	    }
	    output = serializeDeeper(output, options.deepJson);
	    return output;
	  });
	})(Backbone, _);

	/* Backbone.Syncer */
	
	var Model = Backbone.Model;
	
	var previousSet = Backbone.Model.prototype.set;
	var previousSave = Backbone.Model.prototype.save;
	var previousToJSON = Backbone.Model.prototype.toJSON;
	
	/**
	 * Replacement for Backbone.Model. Supports a global track point.
	 *
	 * @class Backbone.Model
	 * @extends Backbone.Model
	 */
	Backbone.Model = Backbone.Model.extend({
	
	  /**
	   * @property {string} [cidAttribute="cid"] The attribute to store
	   * the cid in for lookup.
	   */
	  cidAttribute: 'cid',
	
	  constructor: function () {
	    // The constructor is defined for ensuring to create
	    // the instance without loosing neither the initialization
	    // logic required by this library nor customized by the user.
	    if(this.initialize !== Backbone.Model.prototype.initialize) {
	      var self = this;
	      var overridedInit = this.initialize;
	
	      // Composes new initialize method that contains
	      // both library and customized initialize method
	      this.initialize = _.wrap(Backbone.Model.prototype.initialize, function(backboneInit) {
	        backboneInit.call(self, arguments[2]);
	        overridedInit.call(self, arguments[2]);
	      });
	    }
	
	    return Model.apply(this, arguments);
	  },
	
	  initialize: function () {
	    var self = this;
	
	    this._fetched = false;
	    this.dirtied = {};
	    this._dirtyDestroyed = false;
	    this._destroyed = false;
	
	    // Saving dirty attributes
	    _.extend(this.dirtied, _.omit(this.attributes, [this.idAttribute, this.cidAttribute]));
	
	    // Use `"cid"` for retrieving models by `attributes.cid`.
	    this.set(this.cidAttribute, this.cid);
	
	    // On destroying the model it is marked
	    this.on("destroy", function(model) {
	      model._dirtyDestroyed = true;
	    });
	
	    // Versioning handler.
	    if(this.versionAttribute) {
	      this.on("change:"+this.versionAttribute,
	        function (model, newVersion, options) {
	          var currentVersion = model.previousAttributes()[model.versionAttribute];
	          if (options && options.version
	                && isLaterVersion(newVersion, currentVersion)) {
	            model._fetched = false;
	          }
	      });
	    }
	
	    // Add the model to `all` for each constructor in its prototype chain.
	    var ctor = this.constructor;
	    do { ctor.all().add(this); } while (ctor = ctor.parent);
	
	  },
	
	  /**
	   * @property {String|Boolean} [versionAttribute=false] Represents
	   * the attribute used as version stamps for the model. In case 'false',
	   * versioning is not enabled for the model.
	   */
	  versionAttribute: false,
	
	  /**
	   * @property {boolean} [_fetched="false"] Flag that means if the model
	   * has been fetched remotely.
	   */
	  _fetched: false,
	
	  /**
	   * @return {boolean} 'true' if this model has been fetched remotely,
	   * 'false' otherwise
	   */
	  isFetched: function () {
	    return this._fetched;
	  },
	
	  /**
	   * @property {Object} [dirtied] Internal hash containing all
	   * attributes that have changed since its last server synchronization.
	   */
	  dirtied: {},
	
	  /**
	   * @return {Object} [dirtiedAttributes] Retrieve a copy of the attributes that have
	   * changed since the last server synchronization.
	   */
	  dirtiedAttributes: function() {
	    return _.clone(this.dirtied);
	  },
	
	  /**
	   * @param {Array.<String>} [attr] The attribute to check if has been changed.
	   * @return {boolean} 'true' in case the model changed since its last sever
	   * synchronization, 'false' otherwise
	   */
	  hasDirtied: function (attr) {
	    if (attr == null) return !_.isEmpty(this.dirtied);
	    return _.has(this.dirtied, attr);
	  },
	
	  /**
	   * @property {boolean} [_dirtyDestroyed="false"] Flag that means if the model
	   * has been destroyed locally.
	   */
	  _dirtyDestroyed: false,
	
	  /**
	   * @return {boolean} 'true' if this model has been destroyed locally,
	   * 'false' otherwise
	   */
	  isDirtyDestroyed: function () {
	    return this._dirtyDestroyed;
	  },
	
	  /**
	   * Erases dirtied changes of the model, whether attribute change or model destroy.
	   */
	  clearDirtied: function() {
	    this.dirtied = {};
	    this.dirtiedDestroyed = false;
	  },
	
	  set: function(key, val, options) {
	    if (key == null) return this;
	
	    var attrs;
	    if (typeof key === 'object') {
	      attrs = key;
	      options = val;
	    } else {
	      (attrs = {})[key] = val;
	    }
	
	    options || (options = {});
	
	    var output = previousSet.call(this, attrs, options);
	
	    if(!options.response) {
	      _.extend(this.dirtied, _.omit(attrs, [this.idAttribute, this.cidAttribute]));
	    }
	
	    return output;
	  },
	
	  /**
	   * @property {boolean} [_destroyed="false"] Flag that means if the model
	   * has been destroyed remotely.
	   */
	  _destroyed: false,
	
	  /**
	   * @return {boolean} 'true' if this model has been destroyed remotely,
	   * 'false' otherwise
	   */
	  isDestroyed: function () {
	    return this._destroyed;
	  },
	
	  /**
	   * Alters save method to include changes being set as an option
	   * for the Syncer method.
	   */
	  save: function(key, val, options) {
	    var attrs;
	    if (key == null || typeof key === 'object') {
	      attrs = key;
	      options = val;
	    } else {
	      (attrs = {})[key] = val;
	    }
	
	    options || (options = {});
	
	    if(options.patch) {
	      options.changes = attrs;
	    } else {
	      options.changes = _.extend(_.clone(this.attributes), attrs);
	    }
	
	    return previousSave.apply(this, [attrs, options]);
	  },
	
	  /**
	   * Fetches the model if it has not been fetched before.
	   *
	   * @param {Object} [options]
	   * @return {Object} xhr
	   */
	  pull: function(options) {
	    options || (options = {});
	    return this.fetch(_.extend(options, {mode: "infinite"}));
	  },
	
	  /**
	   * Pushes the changes performed to the model; create, update
	   * or destroy.
	   *
	   * @param {Object} [options]
	   * @return {Object} xhr
	   */
	  push: function(options) {
	    options || (options = {});
	    var options = _.extend(options, {mode: "server"});
	
	    if(this.isDirtyDestroyed()) {
	      // Model is marked as destroyed, but in case is new, it won't be synchronized.
	      if(this.isNew()) return;
	      return this.destroy(options);
	    } else if(this.isNew()) {
	      // Model is new, it will be created remotelly.
	      return this.save({}, options);
	    } else if(this.hasDirtied()) {
	      // Model has dirtied changes, it will be updated remotelly.
	      return this.save(this.dirtiedAttributes(), options);
	    }
	  },
	
	  /**
	   * Alters toJSON for enabling to remove cid from toJSON response.
	   */
	  toJSON: function (options) {
	    var output = previousToJSON.call(this, options);
	
	    // Include cid?
	    if (options && !options.cid) {
	      delete output[this.cidAttribute];
	    }
	
	    return output;
	  }
	
	}, {
	
	  /**
	   * Factory method that returns a model instance and
	   * ensures only one is gonna be created with same id.
	   *
	   * @param {Object} [attrs] Attributes for the new instance.
	   * @param {Object} [options] Options for the new instance.
	   */
	  create: function (attrs, options) {
	    options || (options = {});
	
	    // Corrects id attr according to the option passed.
	    if (options.idAttribute && attrs[options.idAttribute]) {
	      var tmp = attrs[options.idAttribute];
	      delete attrs[options.idAttribute];
	      attrs[this.prototype.idAttribute] = tmp;
	    }
	
	    // Corrects cid attr according to the option passed.
	    if (options.cidAttribute && attrs[options.cidAttribute]) {
	      var tmp = attrs[options.cidAttribute];
	      delete attrs[options.cidAttribute];
	      attrs[this.prototype.cidAttribute] = tmp;
	    }
	
	    var id = attrs && attrs[this.prototype.idAttribute];
	
	    var model = this.find(attrs);
	
	    // If found by id, modify and return it.
	    if(model) {
	
	      // Modifies only if `attrs` does not reference to an existing model.
	      if(attrs !== model.attributes) {
	        model.set(model.parse(attrs), _.extend(options, {silent: false}));
	
	        return model;
	      }
	
	      // Makes validations if required by options
	      if(options.validate)
	        model._validate({}, options);
	
	      return model;
	    }
	    
	    // Throw if a model already exists with the same id in a superclass.
	    var parent = this;
	    while (parent = parent.parent) {
	      if (!parent.all().get(id)) continue;
	      throw new Error('Model with id "' + id + '" already exists.');
	    }
	
	    // Ensure attributes are parsed.
	    options.parse = true;
	
	    return new this(attrs, options);
	  },
	
	  /**
	   * Returns a model by its id or cid from the local cache
	   * of the model.
	   *
	   * @param {Object} [attrs] An id or cid for looking up.
	   */
	  find: function (attrs){
	    if (!attrs) return false;
	
	    var cid = attrs[this.prototype.cidAttribute];
	    var id = attrs[this.prototype.idAttribute];
	
	    return (cid || id) && this.all().get(cid || id) || false;
	  },
	
	  /**
	   * Returns the collection that represents the local cache
	   * of the model.
	   */
	  all: function () {
	    if(!this._all) {
	      var Constructor = this;
	      var All = Backbone.Collection.extend({
	        model: Constructor
	      });
	
	      var all = this._all = new All();
	
	      all.on("destroy", function(model) {
	        if (model.isDirtyDestroyed() && !model.isDestroyed())
	          all.add(model, {silent: true});
	      });
	    }
	
	    return this._all;
	  },
	
	  /**
	   * Resets the local cache of the model.
	   */
	  reset: function () {
	    this.all().reset();
	  }
	});
	
	var prevInitCollection = Backbone.Collection.prototype.initialize;
	var prevFetchCollection = Backbone.Collection.prototype.fetch;
	
	/**
	 * Enhancements for Backbone.Collection.
	 *
	 * @class Backbone.Collection
	 * @extends Backbone.Collection
	 */
	Backbone.Collection = Backbone.Collection.extend({
	
	  /**
	   * Returns the collection url for specific models
	   * within the collection.
	   *
	   * @param {Array} [ids]
	   * @return {String}
	   */
	  idsUrl: function (ids) {
	    var url = _.result(this, 'url') || urlError();
	    return url+Backbone.Syncer.IDS_URL_SEPARATOR+ids.join(Backbone.Syncer.IDS_SEPARATOR);
	  },
	
	  /**
	   * Alters fetch method to enable infinite mode.
	   */
	  fetch: function(options) {
	    options = _.extend({parse: true}, options);
	
	    var success = options.success;
	
	    var collection = this;
	    options.success = function(resp) {
	      if (success) success.call(options.context, collection, resp, options);
	      collection.trigger('sync', collection, resp, options);
	    };
	
	    wrapError(this, options);
	
	    return this.sync('read', this, options);
	
	  },
	
	  /**
	   * Method to save all models from a collection.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} xhrs
	   */
	  save: function(options) {
	    options || (options = {});
	
	    var xhrs = [];
	    this.each(function (model) {
	        var xhr = model.save([], options);
	        xhrs.push(xhr);
	    });
	
	    return xhrs;
	  },
	
	  /**
	   * Method to destroy all models from a collection.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} xhrs
	   */
	  destroy: function(options) {
	    options || (options = {});
	
	    var xhrs = [];
	    var models = _.extend([], this.models);
	    _.each(models, function (model) {
	      var xhr = model.destroy(options);
	      xhrs.push(xhr);
	    });
	
	    return xhrs;
	  },
	
	  /**
	   * Fetches the collection models that are not fetched.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} xhrs
	   */
	  pull: function(options) {
	    options || (options = {});
	    return this.fetch(_.extend(options, {mode: "infinite"}));
	  },
	
	  /**
	   * Method to push all models from a collection.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} xhrs
	   */
	  push: function(options) {
	    options || (options = {});
	
	    var xhrs = [];
	    var models = _.extend([], this.models);
	    _.each(models, function (model) {
	        var xhr = model.push(options);
	        xhrs.push(xhr);
	    });
	
	    return xhrs;
	  },
	
	});
	
	var serverSync = Backbone.Syncer.serverSync;
	
	var Syncer = {};
	
	/**
	 * Syncer's logic for sync methods.
	 */
	Syncer.sync = function (method, model, options) {
	  options || (options = {});
	
	  options.method = method;
	
	  options.mode || (options.mode = 'server');
	
	  if(model instanceof Backbone.Model) {
	    return modelSync.apply(this, [method, model, options]);
	  } else if(model instanceof Backbone.Collection) {
	    return collectionSync.apply(this, [method, model, options]);
	  }
	
	}
	
	/**
	 * Syncer's logic for model sync methods.
	 */
	function modelSync(method, model, options) {
	  var mode = options.mode;
	
	  switch(method) {
	    case "create":
	    case "update":
	    case "patch":
	      var success = options.success;
	
	      if(mode === "client") {
	        // Client mode.
	        _.defer(success);
	        return;
	      }
	
	      // Server mode.
	      options.success = function (response) {
	        options.response = true;
	
	        // Marks the model as fetched in case it is a new one.
	        if(method === "create") {
	          model._fetched = true;
	        }
	
	        // Resolves attributes marked as dirtied.
	        _.each(options.changes, function (attrVal, attrKey) {
	          var dirtiedVal = model.dirtied[attrKey];
	
	          if(dirtiedVal === attrVal)
	            delete model.dirtied[attrKey];
	        });
	
	        if(success) success.call(options.context, response);
	      };
	
	      return serverSync.apply(this, [method, model, options]);
	
	    case "delete":
	      var success = options.success;
	
	      if(mode === "client") {
	        // Client mode.
	        _.defer(success);
	        return;
	      }
	
	      // Server mode.
	      options.success = function (response) {
	        options.response = true;
	
	        if(mode === "server") {
	          model.constructor.all().remove(model);
	          model._destroyed = true;
	        }
	
	        if(success) success.call(options.context, response);
	      };
	
	      return serverSync.apply(this, [method, model, options]);
	
	    case "read":
	      var success = options.success;
	
	      if(mode === "client") {
	        // Client mode.
	        _.defer(success);
	        return;
	      }
	
	      if(mode === "infinite") {
	        // Infinite mode.
	        if(model.isFetched()) {
	          // Model already fetched.
	          _.defer(success);
	          return;
	        }
	      }
	
	      // Server mode & infinite mode with the model not fetched.
	      options.success = function (response) {
	        options.response = true;
	
	        model._fetched = true;
	
	        if(success) success.call(options.context, response);
	      };
	
	      return serverSync.apply(this, [method, model, options]);
	
	  }
	}
	
	/**
	 * Syncer's logic for collection sync methods.
	 */
	function collectionSync(method, collection, options) {
	  var mode = options.mode;
	
	  switch(method) {
	    case "read":
	      var success = options.success;
	
	      options.remove = false;
	
	      var modelsToFetch;
	      if(mode === "infinite") {
	        // Infinite mode.
	        modelsToFetch = collection.filter(function (model) {
	          return !model.isNew() && !model.isFetched();
	        });
	
	        if(_.isEmpty(modelsToFetch)) {
	          _.defer(success);
	          return;
	        }
	
	        var idsToFetch = _.map(modelsToFetch, function (model) {
	            return model.id;
	        });
	
	        options.url = collection.idsUrl(idsToFetch);
	      }
	
	      // Server mode.
	      options.success = function (resp) {
	        options.response = true;
	
	        // Prepares the collection according to the passed option.
	        var method = options.reset ? 'reset' : 'set';
	        collection[method](resp, options);
	
	        // Marks responsed models as fetched.
	        var models = resp;
	        _.each(models, function (value) {
	          var model = collection.get(value);
	          model._fetched = true;
	        });
	
	        // Marks the collection as fetched.
	        collection.fetched = true;
	
	        if(success) success.call(options.context, resp);
	      };
	
	      return serverSync.apply(this, [method, collection, options]);
	
	  }
	}
	
	// Replaces the previous Backbone.sync method by the Syncer's one.
	Backbone.sync = Syncer.sync;
	
	/**
	 * @return {Boolean} Checks whether 'newVersion' is more actual than
	 * 'currentVersion'.
	 */
	function isLaterVersion (newVersion, currentVersion) {
	  if(_.isUndefined(newVersion)) {
	    return false;
	  }
	
	  if(_.isUndefined(currentVersion)) {
	    return true;
	  }
	
	  return newVersion !== currentVersion;
	}
	
	var wrapError = function(model, options) {
	  var error = options.error;
	  options.error = function(resp) {
	    if (error) error.call(options.context, model, resp, options);
	    model.trigger('error', model, resp, options);
	  };
	};
	
	var urlError = function() {
	  throw new Error('A "url" property or function must be specified');
	};
	
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
	  }
	});
	
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
	  this.localCache = model.constructor.all();
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
	      options.storeName ||
	      _.result(this.model.constructor, 'storeName') ||
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
	    var serialized =  {
	      at: this.model.toJSON(_.extend({}, options, {
	        cid: false
	      })),
	      di: _.omit(this.model.dirtiedAttributes(), "cid"),
	      dd: this.model.isDirtyDestroyed(),
	      ch: _.omit(this.model.changedAttributes(), "cid"),
	      pr: _.omit(this.model.previousAttributes(), "cid"),
	      fe: this.model.isFetched(),
	      de: this.model.isDestroyed()
	    };
	
	    var sid = this.model.sid;
	    if (sid) {
	      serialized.sid = sid;
	    }
	
	    return serialized;
	  },
	
	  /**
	   * Deserializes the model information.
	   * @param {Object} [object] The information to deserialize.
	   */
	  deserialize: function (serialized, options) {
	    var sid = serialized.sid;
	
	    this.model.sid = sid;
	
	    var attrs = serialized.at;
	
	    this.model.set(attrs, _.extend({}, options, {localStorage: false}));
	
	    this.model.dirtied = serialized.di;
	    this.model._dirtyDestroyed = serialized.dd;
	    this.model.changed = serialized.ch;
	    this.model._previousAttributes = serialized.pr;
	    this.model._fetched = serialized.fe;
	    this.model._destroyed = serialized.de;
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
	        if ((sid = serializedModel.sid)) {
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
	        } else if (!_.isUndefined(serializedModel.at.id)) {
	          // The model is a remote one.
	          var attrs = {};
	
	          attrs.id = serializedModel.at.id;
	
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
	
	
	var prevAllModel = Backbone.Model.prototype.constructor.all;
	
	/**
	 * Extends Backbone.Model contructor to enable Locally.
	 */
	_.extend(Backbone.Model.prototype.constructor, {  
	  /**
	   * @property {string} [storeName=""] 
	   * The keyname of the model storage.
	   */
	  storeName: undefined,
	
	  all: function () {
	    var all = prevAllModel.call(this);
	
	    if(!all.storeName) {
	      all.storeName = this.storeName+":all";
	
	      all.on("update", function (model, collection, options) {
	        if (options && options.localStorage) {
	          this.storage().store();
	        }
	      }, all);
	    }
	
	    return all;
	  }
	});
	
	var prevInit = Backbone.Model.prototype.initialize;
	var previousSetModel = Backbone.Model.prototype.set;
	var prevFetchModel = Backbone.Model.prototype.fetch;
	
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
	
	  initialize: function (options) {
	    prevInit.call(this, options);
	
	    // On destroying the model from localStorage.
	    this.on("destroy", function(model, collection, options) {
	      if (options && options.localStorage) {
	        this.storage().remove(options.localStorage);
	      }
	    }, this);
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
	  }
	
	});
	
	var previousSetCollection = Backbone.Collection.prototype.set;
	
	var prevFetchCollection = Backbone.Collection.prototype.fetch;
	var prevSaveCollection = Backbone.Collection.prototype.save;
	var prevDestroyCollection = Backbone.Collection.prototype.destroy;
	
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
	    var output = previousSetCollection.call(this, models, options);
	    
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
	
	    return prevFetchCollection.call(this, options);
	  },
	
	  /**
	   * Alters `save` to enable `localStorage` option.
	   */
	  save: function (options) {
	    if (options && options.localStorage) {
	      this.storage().store(options.localStorage);
	    }
	
	    return prevSaveCollection.call(this, options);
	  },
	
	  /**
	   * Alters `destroy` to enable `localStorage` option.
	   */
	  destroy: function (options) {
	    if (options && options.localStorage) {
	      this.storage().remove(options.localStorage);
	    }
	
	    return prevDestroyCollection.call(this, options);
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
	

}));

