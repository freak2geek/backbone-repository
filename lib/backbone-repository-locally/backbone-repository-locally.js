/*! backbone-repository-locally - v0.1.0 - 2016-01-08
* Copyright (c) 2016 Nacho Codoñer; Licensed MIT */


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

	var Repository = {
	  // Default backbone sync function.
		backboneSync: Backbone.sync,
	  /**
	   * Returns an array with the sync mode names.
	   */
	  modes : function () {
	    return _.keys(syncModes);
	  },
	  /**
	   * Registers a new sync mode.
	   * @param {String|Object} [mode] Mode name or configuration {mode: fn}
	   * @param {Function} [fn] Sync method
	   */
	  setMode: function (mode, fn) {
	    if (_.isObject(mode)) {
	      _.extend(syncModes, mode);
	    } else {
	      syncModes[mode] = fn;
	    }
	  },
	  /**
	   * Unregisters sync modes.
	   * @param {String} [mode] Mode name
	   */
	  removeMode: function (mode) {
	    delete syncModes[mode];
	  },
	  /**
	   * Get sync mode method.
	   * @param {String} [mode] Mode name
	   */
	  getMode: function (mode) {
	    if (_.isFunction(mode)) {
	      return mode;
	    }
	
	    return syncModes[mode];
	  },
	  /**
	   * Gets the default mode.
	   */
	  getDefaultMode: function () {
	    return defaultMode;
	  },
	  /**
	   * Sets the default mode.
	   * @param {String|Function} [mode] Mode name or fn
	   */
	  setDefaultMode: function (mode) {
	    if (_.isFunction(mode)) {
	      defaultMode = _.findKey(syncModes, function (value) {
	        return (value === mode);
	      });
	    } else {
	      defaultMode = mode;
	    }
	  },
	  /**
	   * Resets sync modes.
	   */
	  resetModes: function () {
	    syncModes = {};
	  },
		VERSION:  '0.1.0'
	};
	
	// Hash containing sync modes registered.
	var syncModes = {};
	
	// Private variable containing defaultMode
	var defaultMode;
	
	Backbone.Repository = Repository;
	

	/*! backbone.jsonify - v0.2.0 - 2015-11-14
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

	/* Backbone.Repository */
	
	var Model = Backbone.Model;
	
	var previousSet = Backbone.Model.prototype.set;
	var previousFetch = Backbone.Model.prototype.fetch;
	var previousSave = Backbone.Model.prototype.save;
	var previousDestroy = Backbone.Model.prototype.destroy;
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
	        backboneInit.apply(self, _.rest(arguments));
	        overridedInit.apply(self, _.rest(arguments));
	      });
	    }
	
	    return Model.apply(this, arguments);
	  },
	
	  initialize: function () {
	    var self = this;
	
	    this.dirtied = {};
	    this._destroyed = {};
	    this._fetched = {};
	
	    _.each(Backbone.Repository.modes(), function (mode) {
	      this.dirtied[mode] = {};
	      this._destroyed[mode] = false;
	      this._fetched[mode] = false;
	    }.bind(this));
	
	    this._dirtyDestroyed = false;
	
	    // Saving dirty attributes
	    _.each(Backbone.Repository.modes(), function (mode) {
	      this.dirtied[mode] || (this.dirtied[mode] = {});
	      _.extend(this.dirtied[mode], _.omit(this.attributes, [this.idAttribute, this.cidAttribute]));
	    }.bind(this));
	
	    // Use `"cid"` for retrieving models by `attributes.cid`.
	    this.set(this.cidAttribute, this.cid);
	
	    // Add the model to `all`.
	    var ctor = this.constructor;
	    ctor.register().add(this);
	
	  },
	
	  /**
	   * @property {String|Boolean} [versionAttribute=false] Represents
	   * the attribute used as version stamps for the model. In case 'false',
	   * versioning is not enabled for the model.
	   */
	  versionAttribute: false,
	
	  /**
	   * @property {Object<String,Boolean>} [_fetched={}] Flag that means if the model
	   * has been fetched through a mode.
	   */
	  _fetched: {},
	
	  /**
	   * @return {boolean} 'true' if this model has been fetched through the mode,
	   * 'false' otherwise
	   */
	  isFetched: function (options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	    return this._fetched[options.mode] || false;
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
	  dirtiedAttributes: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    return _.clone(this.dirtied[options.mode]) || {};
	  },
	
	  /**
	   * @param {Array.<String>} [attr] The attribute to check if has been changed.
	   * @return {boolean} 'true' in case the model changed since its last sever
	   * synchronization, 'false' otherwise
	   */
	  hasDirtied: function (attr, options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    if (attr == null) return !_.isEmpty(this.dirtied[options.mode]);
	    return _.has(this.dirtied[options.mode], attr);
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
	    _.each(this.dirtied, function (value, key) {
	      this.dirtied[key] = {}
	    }.bind(this));
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
	
	    if(_.isUndefined(options.dirty)) {
	      options.dirty = true; // Default dirty option.
	    }
	
	    var previousVersion;
	    if(options.version) {
	      previousVersion = this.attributes[this.versionAttribute];
	    }
	
	    var output = previousSet.call(this, attrs, options);
	
	    if(options.dirty) {
	      _.each(Backbone.Repository.modes(), function (mode) {
	        this.dirtied[mode] || (this.dirtied[mode] = {});
	        _.extend(this.dirtied[mode], _.omit(attrs, [this.idAttribute, this.cidAttribute]));
	      }.bind(this));
	    }
	
	    // Versioning handler.
	    if(options.version &&
	      this.versionAttribute && attrs[this.versionAttribute]) {
	      var newVersion = attrs[this.versionAttribute];
	      checkVersion(this, options, newVersion, previousVersion);
	    }
	
	    return output;
	  },
	
	  /**
	   * @property {boolean} [_destroyed={}] Flag that means if the model
	   * has been destroyed against the sync mode.
	   */
	  _destroyed: {},
	
	  /**
	   * @return {boolean} 'true' if this model has been destroyed against the sync mode,
	   * 'false' otherwise
	   */
	  isDestroyed: function (options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	    return this._destroyed[options.mode] || false;
	  },
	
	  /**
	   * Alters fetch method.
	   */
	  fetch: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	    return previousFetch.apply(this, [options]);
	  },
	
	  /**
	   * Alters save method to include changes being set as an option
	   * for the Repository method.
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
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    if(options.patch) {
	      options.changes = attrs;
	    } else {
	      options.changes = _.extend(_.clone(this.attributes), attrs);
	    }
	
	    return previousSave.apply(this, [attrs, options]);
	  },
	
	  /**
	   * Alters destroy method to set diryDestroyed flag.
	   */
	  destroy: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    var model = this;
	    var success = options.success;
	    var wait = options.wait;
	
	    options.success = function(resp) {
	      if (wait) model._dirtyDestroyed = true;
	      if (success) success.call(options.context, model, resp, options);
	    };
	
	    if (!wait) model._dirtyDestroyed = true;
	
	    // Forces to execute sync method when the model is new as well.
	    if (this.isNew()) {
	      var destroy = function() {
	        model.stopListening();
	        model.trigger('destroy', model, model.collection, options);
	      };
	
	      options.success = function(resp) {
	        if (wait) model._dirtyDestroyed = true;
	
	        if (wait) destroy();
	        if (success) success.call(options.context, model, resp, options);
	        if (!model.isNew()) model.trigger('sync', model, resp, options);
	      };
	
	      _.defer(options.success);
	
	      if (!wait) destroy();
	
	      wrapError(this, options);
	      return this.sync('delete', this, options);
	    } else {
	      return previousDestroy.apply(this, [options]);
	    }
	  },
	
	  /**
	   * Fetches the model if it has not been fetched before.
	   *
	   * @param {Object} [options]
	   * @return {Object} xhr
	   */
	  pull: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    var mode = options.mode;
	    if (this.isFetched(options)) {
	      _.defer(options.success, this, undefined, options);
	      return;
	    }
	
	    return this.fetch(options);
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
	
	    if(this.isDirtyDestroyed()) {
	      // Model is marked as destroyed, but in case is new, it won't be synchronized.
	      if(this.isNew()) return;
	      return this.destroy(options);
	    } else if(this.isNew()) {
	      // Model is new, it will be created remotelly.
	      return this.save(null, options);
	    } else if(this.hasDirtied(null, options)) {
	      // Model has dirtied changes, it will be updated remotelly.
	      return this.save(this.dirtiedAttributes(options), options);
	    }
	  },
	
	  /**
	   * @property {String} [checkUrl=""] The checking endpoint for the Model.
	   */
	  checkUrl: '',
	
	  /**
	   * Check method
	   *
	   * @param {Object} [options]
	   * @return {Object} xhr
	   */
	  check: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    var url = options.checkUrl || _.result(this, 'checkUrl');
	    if (!url) {
	      throw new Error('The "checkUrl" must be specified.');
	    }
	
	    return this.fetch(_.extend(options, {
	      url: url,
	      version: true
	    }));
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
	
	    return (cid || id) && this.register().get(cid || id) || false;
	  },
	
	  /**
	   * Returns the collection that represents the local cache
	   * of the model.
	   */
	  register: function () {
	    if(!this._register) {
	      var Constructor = this;
	      var Register = Backbone.Collection.extend({
	        model: Constructor
	      });
	
	      var register = this._register = new Register();
	
	      register.on("destroy", function(model) {
	        if (model.isDirtyDestroyed() && !model.isDestroyed())
	          register.add(model, {silent: true});
	      });
	    }
	
	    return this._register;
	  },
	
	  /**
	   * Resets the local cache of the model.
	   */
	  reset: function () {
	    this.register().reset();
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
	    return "/"+ids.join(";");
	  },
	
	  /**
	   * Alters fetch method to enable infinite mode.
	   */
	  fetch: function(options) {
	    options = _.extend({parse: true}, options);
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    return prevFetchCollection.apply(this, [options]);
	  },
	
	  /**
	   * Method to save all models from a collection.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} outputs
	   */
	  save: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    var success = options.success;
	    options.originalSuccess = options.success;
	
	    var collection = this;
	    options.success = function(resp) {
	      var method = options.reset ? 'reset' : 'set';
	      collection[method](resp, options);
	      if (success) success.call(options.context, collection, resp, options);
	      collection.trigger('sync', collection, resp, options);
	    };
	
	    return this.sync('update', this, options);
	  },
	
	  /**
	   * Method to destroy all models from a collection.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} outputs
	   */
	  destroy: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    var success = options.success;
	    options.originalSuccess = options.success;
	
	    var collection = this;
	    options.success = function(resp) {
	      if (success) success.call(options.context, collection, resp, options);
	      collection.trigger('sync', collection, resp, options);
	    };
	
	    return this.sync('delete', this, options);
	  },
	
	  /**
	   * Fetches the collection models that are not fetched.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} xhrs
	   */
	  pull: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    var success = options.success;
	
	    options.remove = false;
	
	    options.modelsToFetch = this.filter(function (model) {
	      return !model.isNew() && !model.isFetched();
	    });
	
	    if(_.isEmpty(options.modelsToFetch)) {
	      _.defer(success, this, undefined, options);
	      return;
	    }
	
	    var idsToFetch = _.map(options.modelsToFetch, function (model) {
	        return model.id;
	    });
	
	    options.url = _.result(this, 'url')+this.idsUrl(idsToFetch);
	
	    return this.fetch(options);
	  },
	
	  /**
	   * Method to push all models from a collection.
	   *
	   * @param {Object} [options]
	   * @return {Array<Object>} outputs
	   */
	  push: function(options) {
	    var models = _.clone(this.models);
	    _.each(models, function (model) {
	        model.push(options);
	    });
	  },
	
	
	  /**
	   * @property {String} [checkUrl=""] The checking endpoint for Collection.
	   */
	  checkUrl: '',
	
	  /**
	   * Check method
	   *
	   * @param {Object} [options]
	   * @return {Object} xhr
	   */
	  check: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Repository.getDefaultMode()});
	
	    var url = options.checkUrl || _.result(this, 'checkUrl');
	    if (!url) {
	      throw new Error('The "checkUrl" must be specified.');
	    }
	
	    return this.fetch(_.extend(options, {
	      url: url,
	      version: true
	    }));
	  }
	
	});
	
	/**
	 * Repository's logic for sync methods.
	 */
	var sync = function (method, model, options) {
	  options || (options = {});
	
	  options.method = method;
	
	  var mode = options.mode;
	
	  // Wrap success function to handle model states for the mode.
	  wrapSuccess(method, model, options);
	
	  if (mode) {
	    var syncFn = Repository.getMode(mode);
	
	    if (syncFn) {
	      return syncFn.apply(options.context, [method, model, options]);
	    } else {
	      throw new Error('The "mode" passed must be implemented.');
	    }
	  } else {
	    return Repository.backboneSync.apply(options.context, [method, model, options]);
	  }
	
	}
	
	var wrapSuccess = function (method, model, options) {
	  var mode = options.mode;
	
	  if(model instanceof Backbone.Model) {
	
	    switch(method) {
	      case "create":
	      case "update":
	      case "patch":
	        var success = options.success;
	
	        options.success = function (response) {
	          // Marks the model as fetched in case it is a new one.
	          if(method === "create") {
	            model._fetched[mode] = true;
	          }
	
	          // Resolves attributes marked as dirtied.
	          _.each(options.changes, function (attrVal, attrKey) {
	            var dirtiedVal = model.dirtied[mode][attrKey];
	
	            if(dirtiedVal === attrVal) {
	              delete model.dirtied[mode][attrKey];
	            }
	          });
	
	          if(success) success.call(options.context, response);
	        };
	
	        break;
	
	      case "delete":
	        var success = options.success;
	
	        // Server mode.
	        options.success = function (response) {
	          model._destroyed[mode] = true;
	
	          if(success) success.call(options.context, response);
	        };
	
	        break;
	
	      case "read":
	        var success = options.success;
	
	        options.success = function (resp) {
	          // Mark model as fetched.
	          if(!options.version) {
	            model._fetched[mode] = true;
	          }
	
	          if(success) success.call(options.context, resp);
	        };
	
	        break;
	
	    }
	
	  } else if(model instanceof Backbone.Collection) {
	
	    var collection = model;
	
	    switch(method) {
	      case "read":
	        var success = options.success;
	
	        options.success = function (resp) {
	          _.each(collection.models, function (model) {
	            var searchBy = {};
	            searchBy[model.idAttribute] = model.id;
	
	            var respModel = _.findWhere(resp, searchBy);
	
	            // Mark model as fetched.
	            if(!options.version) {
	              model._fetched[mode] = true;
	            }
	          });
	
	          if(success) success.call(options.context, resp);
	        };
	
	        break;
	
	    }
	  }
	}
	
	/**
	 * Sync method for client mode.
	 */
	var clientSync = function (method, model, options) {
	  var mode = options.mode;
	
	  if(model instanceof Backbone.Model) {
	    _.defer(options.success);
	  } else if(model instanceof Backbone.Collection) {
	    options.success = options.originalSuccess;
	
	    var collection = model;
	    switch(method) {
	      case "create":
	      case "update":
	      case "patch":
	        collection.each(function (model) {
	          model.save(null, options);
	        });
	        break;
	      case "delete":
	        collection.each(function (model) {
	          model.destroy(options);
	        });
	        break;
	    }
	  }
	}
	
	/**
	 * Sync method for server mode.
	 */
	var serverSync = function (method, model, options) {
	  var mode = options.mode;
	
	  if(model instanceof Backbone.Model) {
	
	    switch(method) {
	      case "create":
	      case "update":
	      case "patch":
	        var success = options.success;
	
	        options.success = function (response) {
	          // Avoids set to dirty server attributes.
	          options.dirty = false;
	
	          if(success) success.call(options.context, response);
	        };
	
	        return Repository.backboneSync.apply(this, [method, model, options]);
	
	      case "delete":
	        // Performs nothing in case the model is new.
	        if (model.isNew()) return false;
	
	        // Avoids set to dirty server attributes.
	        options.dirty = false;
	
	        model.constructor.register().remove(model);
	
	        return Repository.backboneSync.apply(this, [method, model, options]);
	
	      case "read":
	        // Avoids set to dirty server attributes.
	        options.dirty = false;
	
	        return Repository.backboneSync.apply(this, [method, model, options]);
	
	    }
	
	  } else if(model instanceof Backbone.Collection) {
	
	    var collection = model;
	
	    switch(method) {
	      case "read":
	        var success = options.success;
	
	        options.remove = false;
	
	        options.success = function (resp) {
	          // Avoids set to dirty server attributes.
	          options.dirty = false;
	
	          // Prepares the collection according to the passed option.
	          var method = options.reset ? 'reset' : 'set';
	          collection[method](resp, options);
	
	          if(success) success.call(options.context, resp);
	        };
	
	        return Repository.backboneSync.apply(this, [method, collection, options]);
	
	      case "create":
	      case "update":
	      case "patch":
	        options.success = options.originalSuccess;
	
	        collection.each(function (model) {
	          model.save(null, options);
	        });
	        break;
	      case "delete":
	        options.success = options.originalSuccess;
	
	        var models = _.clone(collection.models);
	        _.each(models, function (model) {
	          model.destroy(options);
	        });
	        break;
	
	    }
	
	  }
	
	}
	
	var syncMode = {
	  client: clientSync,
	  server: serverSync
	};
	
	// Registers syncModes from the library.
	Repository.setMode(syncMode);
	
	// Establish default mode.
	Repository.setDefaultMode("server");
	
	// Replaces the previous Backbone.sync method by the Repository's one.
	Backbone.sync = sync;
	
	/**
	 * @return {Boolean} Change fetch status whether 'newVersion' is more actual than
	 * 'currentVersion'.
	 */
	function checkVersion (model, options, newVersion, currentVersion) {
	  if (isLaterVersion(newVersion, currentVersion)) {
	    var mode = options.mode;
	    if(mode) {
	      model._fetched[mode] = false;
	    }
	
	    // triggers outdated event
	    model.trigger("outdated", model, newVersion, options);
	  }
	}
	
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
	
	/* Backbone.Repository.Locally */
	
	_.extend(Backbone.Repository, {
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
	
	var serialKey = Backbone.Repository.serialKey;
	
	/**
	 * Singleton variable for Locally's Store object.
	 */
	var storage;
	
	/**
	 * Singleton method to get Locally's store object.
	 */
	var Storage = function () {
	  if(!storage) {
	    storage = new Locally.Store({ compress: Backbone.Repository.compressStorage });
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
	
	    var storagePrefix = (Repository.storagePrefix && Repository.storagePrefix+":") || "";
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
	
	    return storagePrefix+
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
	    serialized[serialKey.dirtiedAttributes] = _.values(_.omit(this.model.dirtied, "cid"));
	    serialized[serialKey.dirtyDestroyed] = this.model._dirtyDestroyed;
	    serialized[serialKey.changes] = _.omit(this.model.changed, "cid");
	    serialized[serialKey.previousAttributes] = _.omit(this.model._previousAttributes, "cid");
	    serialized[serialKey.fetched] = _.values(this.model._fetched);
	    serialized[serialKey.destroyed] = _.values(this.model._destroyed);
	
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
	
	    var modes = Backbone.Repository.modes();
	
	    this.model.dirtied = _.object(modes, serialized[serialKey.dirtiedAttributes]);
	    this.model._dirtyDestroyed = serialized[serialKey.dirtyDestroyed];
	    this.model.changed = serialized[serialKey.changes];
	    this.model._previousAttributes = serialized[serialKey.previousAttributes];
	    this.model._fetched = _.object(modes, serialized[serialKey.fetched]);
	    this.model._destroyed = _.object(modes, serialized[serialKey.destroyed]);
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
	
	    var storagePrefix = (Repository.storagePrefix && Repository.storagePrefix+":") || "";
	    var storeName =
	      options.storeName ||
	      _.result(this.collection, 'storeName') ||
	      storeNameError();
	
	    return storagePrefix+storeName;
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
	
	var previousSetCollectionRepository = Backbone.Collection.prototype.set;
	
	var prevFetchCollectionRepository = Backbone.Collection.prototype.fetch;
	var prevSaveCollectionRepository = Backbone.Collection.prototype.save;
	var prevDestroyCollectionRepository = Backbone.Collection.prototype.destroy;
	var prevPullCollectionRepository = Backbone.Collection.prototype.pull;
	
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
	    var output = previousSetCollectionRepository.call(this, models, options);
	
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
	
	    return prevFetchCollectionRepository.call(this, options);
	  },
	
	  /**
	   * Alters `save` to enable `localStorage` option.
	   */
	  save: function (options) {
	    if (options && options.localStorage) {
	      this.storage().store(options.localStorage);
	    }
	
	    return prevSaveCollectionRepository.call(this, options);
	  },
	
	  /**
	   * Alters `destroy` to enable `localStorage` option.
	   */
	  destroy: function (options) {
	    if (options && options.localStorage) {
	      this.storage().remove(options.localStorage);
	    }
	
	    return prevDestroyCollectionRepository.call(this, options);
	  },
	
	  /**
	   * Alters `pull` to enable `localStorage` option.
	   */
	  pull: function (options) {
	    if (options && options.localStorage) {
	      this.storage().load(options.localStorage);
	    }
	
	    return prevPullCollectionRepository.call(this, options);
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
	Repository.setMode("localStorage", localstorageSync);
	

}));

