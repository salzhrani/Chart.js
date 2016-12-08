import Element from './core.element';

/**
 * The plugin service singleton
 * @namespace Chart.plugins
 * @since 2.1.0
 */
export const plugins = {
	_plugins: [],

	/**
	 * Registers the given plugin(s) if not already registered.
	 * @param {Array|Object} plugins plugin instance(s).
	 */
	register: function(plugins) {
		var p = this._plugins;
		([]).concat(plugins).forEach(function(plugin) {
			if (p.indexOf(plugin) === -1) {
				p.push(plugin);
			}
		});
	},

	/**
	 * Unregisters the given plugin(s) only if registered.
	 * @param {Array|Object} plugins plugin instance(s).
	 */
	unregister: function(plugins) {
		var p = this._plugins;
		([]).concat(plugins).forEach(function(plugin) {
			var idx = p.indexOf(plugin);
			if (idx !== -1) {
				p.splice(idx, 1);
			}
		});
	},

	/**
	 * Remove all registered plugins.
	 * @since 2.1.5
	 */
	clear: function() {
		this._plugins = [];
	},

	/**
	 * Returns the number of registered plugins?
	 * @returns {Number}
	 * @since 2.1.5
	 */
	count: function() {
		return this._plugins.length;
	},

	/**
	 * Returns all registered plugin instances.
	 * @returns {Array} array of plugin objects.
	 * @since 2.1.5
	 */
	getAll: function() {
		return this._plugins;
	},

	/**
	 * Calls registered plugins on the specified extension, with the given args. This
	 * method immediately returns as soon as a plugin explicitly returns false. The
	 * returned value can be used, for instance, to interrupt the current action.
	 * @param {String} extension the name of the plugin method to call (e.g. 'beforeUpdate').
	 * @param {Array} [args] extra arguments to apply to the extension call.
	 * @returns {Boolean} false if any of the plugins return false, else returns true.
	 */
	notify: function(extension, args) {
		var plugins = this._plugins;
		var ilen = plugins.length;
		var i, plugin;

		for (i=0; i<ilen; ++i) {
			plugin = plugins[i];
			if (typeof plugin[extension] === 'function') {
				if (plugin[extension].apply(plugin, args || []) === false) {
					return false;
				}
			}
		}

		return true;
	}
};

/**
 * Plugin extension methods.
 * @interface Chart.PluginBase
 * @since 2.1.0
 */
export class PluginBase extends Element {
	// Called at start of chart init
	beforeInit() {}

	// Called at end of chart init
	afterInit() {}

	// Called at start of update
	beforeUpdate() {}

	// Called at end of update
	afterUpdate() {}

	// Called at start of draw
	beforeDraw() {}

	// Called at end of draw
	afterDraw() {}

	// Called during destroy
	destroy() {}
}
