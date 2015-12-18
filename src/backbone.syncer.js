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

    this._fetched = false;
    this.dirtied = {};
    this._dirtyDestroyed = false;
    this._destroyed = false;

    // Saving dirty attributes
    _.extend(this.dirtied, _.omit(this.attributes, [this.idAttribute, this.cidAttribute]));

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

    if(_.isUndefined(options.dirty)) {
      options.dirty = true; // Default dirty option.
    }

    var output = previousSet.call(this, attrs, options);

    if(options.dirty) {
      _.extend(this.dirtied, _.omit(attrs, [this.idAttribute, this.cidAttribute]));
    }

    // Versioning handler.
    if(options && options.version &&
      this.versionAttribute && attrs[this.versionAttribute]) {

      var previousVersion = this._previousAttributes[this.versionAttribute];
      var newVersion = attrs[this.versionAttribute];
      if (isLaterVersion(newVersion, previousVersion)) {
        this._fetched = false;

        // triggers outdated event
        this.trigger("outdated", this, newVersion, options);
      }
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

    if (this.isFetched()) {
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
    _.defaults(options, {mode: Syncer.defaultMode()});

    if(this.isDirtyDestroyed()) {
      // Model is marked as destroyed, but in case is new, it won't be synchronized.
      if(this.isNew()) return;
      return this.destroy(options);
    } else if(this.isNew()) {
      // Model is new, it will be created remotelly.
      return this.save(null, options);
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

/**
 * Sync method for client mode.
 */
var clientSync = function (method, model, options) {
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

          // Marks the model as fetched in case it is a new one.
          if(method === "create") {
            model._fetched = true;
          }

          // Resolves attributes marked as dirtied.
          _.each(options.changes, function (attrVal, attrKey) {
            var dirtiedVal = model.dirtied[attrKey];

            if(dirtiedVal === attrVal) {
              delete model.dirtied[attrKey];
            }
          });

          if(success) success.call(options.context, response);
        };

        return Syncer.backboneSync.apply(this, [method, model, options]);

      case "delete":
        // Performs nothing in case the model is new.
        if (model.isNew()) return false;

        var success = options.success;

        // Server mode.
        options.success = function (response) {
          // Avoids set to dirty server attributes.
          options.dirty = false;

          model.constructor.register().remove(model);
          model._destroyed = true;

          if(success) success.call(options.context, response);
        };

        return Syncer.backboneSync.apply(this, [method, model, options]);

      case "read":
        var success = options.success;

        // Server mode & infinite mode with the model not fetched.
        options.success = function (response) {
          // Avoids set to dirty server attributes.
          options.dirty = false;

          model._fetched = true;

          if(success) success.call(options.context, response);
        };

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
            model._fetched = true;
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
Syncer.defaultMode(serverSync);

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
