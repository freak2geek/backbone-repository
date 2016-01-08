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
	VERSION:  '<%= version %>'
};

// Hash containing sync modes registered.
var syncModes = {};

// Private variable containing defaultMode
var defaultMode;

Backbone.Repository = Repository;
