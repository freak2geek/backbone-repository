var Syncer = {
  // Default backbone sync function.
	backboneSync: Backbone.sync,
  // Hash containing sync modes registered.
  syncMode: {},
  /**
   * Registers a new sync mode.
   * @param {String|Object} [mode] Mode name or configuration {mode: fn}
   * @param {Function} [fn] Sync method
   */
  register: function (mode, fn) {
    if (_.isObject(mode)) {
      _.extend(this.syncMode, mode);
    } else {
      this.syncMode[mode] = fn;
    }
  },
  /**
   * Unregisters sync modes.
   * @param {String} [mode] Mode name
   */
  unregister: function (mode) {
    if (_.isUndefined(mode)) {
      this.syncMode = {};
    } else {
      delete this.syncMode[mode];
    }
  },
  // Default separator for collection's idsUrl
	ids_url_separator: "/",
  // Default separator for each model id in collection's idsUrl
	ids_separator: ";",
	VERSION:  '<%= version %>'
};

Backbone.Syncer = Syncer;
