/*! backbone.syncer - v0.1.0 - 2016-01-06
* Copyright (c) 2016 Nacho Codoñer; Licensed MIT */


(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['backbone', 'underscore'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// CommonJS
		var Backbone = require('backbone'),
			_ = require('underscore');

		module.exports = factory(Backbone, _);
	} else {
		// Browser globals
		factory(root.Backbone, root._);
	}
}(this, function (Backbone, _) {
	'use strict';

	var Syncer = {
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
	  register: function (mode, fn) {
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
	  unregister: function (mode) {
	    delete syncModes[mode];
	  },
	  /**
	   * Get sync mode method.
	   * @param {String} [mode] Mode name
	   */
	  mode: function (mode) {
	    if (_.isFunction(mode)) {
	      return mode;
	    }
	
	    return syncModes[mode];
	  },
	  /**
	   * Default mode.
	   * @param {String|Function} [mode] Mode name or fn
	   */
	  defaultMode: function (mode) {
	    if (!mode) {
	      return defaultMode;
	    } else {
	      if (_.isFunction(mode)) {
	        defaultMode = _.findKey(syncModes, function (value) {
	          return (value === mode);
	        });
	      } else {
	        defaultMode = mode;
	      }
	    }
	  },
	  /**
	   * Resets sync modes.
	   */
	  reset: function () {
	    syncModes = {};
	  },
		VERSION:  '0.1.0'
	};
	
	// Hash containing sync modes registered.
	var syncModes = {};
	
	// Private variable containing defaultMode
	var defaultMode;
	
	Backbone.Syncer = Syncer;
	

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

	/* Backbone.Syncer */
	
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
	
	    this._fetched = {};
	    this.dirtied = {};
	
	    _.each(Backbone.Syncer.modes(), function (mode) {
	      this.dirtied[mode] = {};
	    }.bind(this));
	
	    this._dirtyDestroyed = false;
	    this._destroyed = {};
	
	    // Saving dirty attributes
	    _.each(Backbone.Syncer.modes(), function (mode) {
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
	    return _.clone(this.dirtied[options.mode]) || {};
	  },
	
	  /**
	   * @param {Array.<String>} [attr] The attribute to check if has been changed.
	   * @return {boolean} 'true' in case the model changed since its last sever
	   * synchronization, 'false' otherwise
	   */
	  hasDirtied: function (attr, options) {
	    options || (options = {});
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	
	    var output = previousSet.call(this, attrs, options);
	
	    if(options.dirty) {
	      _.each(Backbone.Syncer.modes(), function (mode) {
	        this.dirtied[mode] || (this.dirtied[mode] = {});
	        _.extend(this.dirtied[mode], _.omit(attrs, [this.idAttribute, this.cidAttribute]));
	      }.bind(this));
	    }
	
	    // Versioning handler.
	    if(options && options.version &&
	      this.versionAttribute && attrs[this.versionAttribute]) {
	
	      var previousVersion = this._previousAttributes[this.versionAttribute];
	      var newVersion = attrs[this.versionAttribute];
	      if (isLaterVersion(newVersion, previousVersion)) {
	        var mode = options.mode;
	
	        if(mode) {
	          this._fetched[mode] = false;
	        }
	
	        // triggers outdated event
	        this.trigger("outdated", this, newVersion, options);
	      }
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	    return this._destroyed[options.mode] || false;
	  },
	
	  /**
	   * Alters fetch method.
	   */
	  fetch: function(options) {
	    options || (options = {});
	    _.defaults(options, {mode: Syncer.defaultMode()});
	    return previousFetch.apply(this, [options]);
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	    _.defaults(options, {mode: Syncer.defaultMode()});
	
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
	  }
	
	});
	
	/**
	 * Syncer's logic for sync methods.
	 */
	var sync = function (method, model, options) {
	  options || (options = {});
	
	  options.method = method;
	
	  var mode = options.mode;
	
	  // Wrap success function to handle model states for the mode.
	  wrapSuccess(method, model, options);
	
	  if (mode) {
	    var syncFn = Syncer.mode(mode);
	
	    if (syncFn) {
	      return syncFn.apply(options.context, [method, model, options]);
	    } else {
	      throw new Error('The "mode" passed must be implemented.');
	    }
	  } else {
	    return Syncer.backboneSync.apply(options.context, [method, model, options]);
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
	          model._fetched[mode] = true;
	
	          if(success) success.call(options.context, resp);
	        };
	
	        break;
	
	    }
	
	  } /*else if(model instanceof Backbone.Collection) {
	
	    var collection = model;
	
	    switch(method) {
	      case "read":
	        var success = options.success;
	
	        options.remove = false;
	
	        // Server mode.
	        options.success = function (resp) {
	          // Avoids set to dirty server attributes.
	          options.dirty = false;
	
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
	
	        return Syncer.backboneSync.apply(this, [method, collection, options]);
	
	    }
	  }*/
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
	
	        // Server mode.
	        options.success = function (response) {
	          // Avoids set to dirty server attributes.
	          options.dirty = false;
	
	          if(success) success.call(options.context, response);
	        };
	
	        return Syncer.backboneSync.apply(this, [method, model, options]);
	
	      case "delete":
	        // Performs nothing in case the model is new.
	        if (model.isNew()) return false;
	
	        // Avoids set to dirty server attributes.
	        options.dirty = false;
	
	        model.constructor.register().remove(model);
	
	        return Syncer.backboneSync.apply(this, [method, model, options]);
	
	      case "read":
	        // Avoids set to dirty server attributes.
	        options.dirty = false;
	
	        return Syncer.backboneSync.apply(this, [method, model, options]);
	
	    }
	
	  } else if(model instanceof Backbone.Collection) {
	
	    var collection = model;
	
	    switch(method) {
	      case "read":
	        var success = options.success;
	
	        options.remove = false;
	
	        // Server mode.
	        options.success = function (resp) {
	          // Avoids set to dirty server attributes.
	          options.dirty = false;
	
	          // Prepares the collection according to the passed option.
	          var method = options.reset ? 'reset' : 'set';
	          collection[method](resp, options);
	
	          // Marks responsed models as fetched.
	          var models = resp;
	          _.each(models, function (value) {
	            var model = collection.get(value);
	            model._fetched[mode] = true;
	          });
	
	          // Marks the collection as fetched.
	          collection.fetched = true;
	
	          if(success) success.call(options.context, resp);
	        };
	
	        return Syncer.backboneSync.apply(this, [method, collection, options]);
	
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
	Syncer.register(syncMode);
	
	// Establish default mode.
	Syncer.defaultMode("server");
	
	// Replaces the previous Backbone.sync method by the Syncer's one.
	Backbone.sync = sync;
	
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
	

}));

