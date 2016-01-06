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
	VERSION:  '<%= version %>'
};

// Hash containing sync modes registered.
var syncModes = {};

// Private variable containing defaultMode
var defaultMode;

Backbone.Syncer = Syncer;
