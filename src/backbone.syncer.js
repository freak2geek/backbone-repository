var Model = Backbone.Model;

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
		// Use `"cid"` for retrieving models by `attributes.cid`.
		this.set(this.cidAttribute, this.cid);

		var ctor = this.constructor;

		// Add the model to `all`.
		ctor.all().add(this);
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
			if(options.validate) {
				model._validate({}, options);
			}

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

		return (cid || id) && this.all().get(cid || id) || false;
	},

	/**
	 * Returns the collection that represents the local cache	 
	 * of the model.
	 */
	all: function (){
		if(!this._all) {
			var Constructor = this;
			var All = Backbone.Collection.extend({
				model: Constructor
			});

			this._all = new All();
		}

		return this._all;
	},

	/**
	 * Resets the local cache of the model.
	 */
	reset: function (){
		this.all().reset();
	}
});