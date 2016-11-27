'use strict';
import {scaleMerge, extend, clone, each} from './core.helpers';
import defaults as chartDefaults from './core.defaults';
import layoutService from './core.layoutService';

export default {
	// Scale registration object. Extensions can register new scale types (such as log or DB scales) and then
	// use the new chart options to grab the correct scale
	constructors: {},
	// Use a registration function so that we can move to an ES6 map when we no longer need to support
	// old browsers

	// Scale config defaults
	defaults: {},
	registerScaleType: function(type, scaleConstructor, defaults) {
		this.constructors[type] = scaleConstructor;
		this.defaults[type] = clone(defaults);
	},
	getScaleConstructor: function(type) {
		return this.constructors.hasOwnProperty(type) ? this.constructors[type] : undefined;
	},
	getScaleDefaults: function(type) {
		// Return the scale defaults merged with the global settings so that we always use the latest ones
		return this.defaults.hasOwnProperty(type) ? scaleMerge(chartDefaults.scale, this.defaults[type]) : {};
	},
	updateScaleDefaults: function(type, additions) {
		var defaults = this.defaults;
		if (defaults.hasOwnProperty(type)) {
			defaults[type] = extend(defaults[type], additions);
		}
	},
	addScalesToLayout: function(chartInstance) {
		// Adds each scale to the chart.boxes array to be sized accordingly
		each(chartInstance.scales, function(scale) {
			layoutService.addBox(chartInstance, scale);
		});
	}
};
