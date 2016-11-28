'use strict';

import Chart from './core';
import './core.legend';
import {getStyle,
	addResizeListener,
	each,
	configMerge,
	uid,
	retinaScale,
	clear,
	getMaximumWidth,
	getMaximumHeight,
	getValueOrDefault,
	easingEffects,
	unbindEvents,
	removeResizeListener,
	bindEvents,
	arrayEquals} from './core.helpers';
import {plugins} from './core.plugin';
import defaults from './core.defaults';
import * as controllers from '../controllers';
import scaleService from './core.scaleService';
import layoutService from './core.layoutService';
import Tooltip from './core.tooltip';
import Interaction from './core.interaction';
import Animation, {animationService} from './core.animation';
import '../scales';
// Create a dictionary of chart types, to allow for extension of existing types
// Chart.types = {};

// Store a reference to each instance - allowing us to globally resize chart instances on window resize.
// Destroy method on the chart will remove the instance of the chart from this reference.
// Chart.instances = {};

// Controllers available for dataset visualization eg. bar, line, slice, etc.
// Chart.controllers = {};

/**
 * The "used" size is the final value of a dimension property after all calculations have
 * been performed. This method uses the computed style of `element` but returns undefined
 * if the computed style is not expressed in pixels. That can happen in some cases where
 * `element` has a size relative to its parent and this last one is not yet displayed,
 * for example because of `display: none` on a parent node.
 * TODO(SB) Move this method in the upcoming core.platform class.
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/used_value
 * @returns {Number} Size in pixels or undefined if unknown.
 */
function readUsedSize(element, property) {
	var value = getStyle(element, property);
	var matches = value && value.match(/(\d+)px/);
	return matches? Number(matches[1]) : undefined;
}

/**
 * Initializes the canvas style and render size without modifying the canvas display size,
 * since responsiveness is handled by the controller.resize() method. The config is used
 * to determine the aspect ratio to apply in case no explicit height has been specified.
 * TODO(SB) Move this method in the upcoming core.platform class.
 */
function initCanvas(canvas, config) {
	var style = canvas.style;

	// NOTE(SB) canvas.getAttribute('width') !== canvas.width: in the first case it
	// returns null or '' if no explicit value has been set to the canvas attribute.
	var renderHeight = canvas.getAttribute('height');
	var renderWidth = canvas.getAttribute('width');

	// Chart.js modifies some canvas values that we want to restore on destroy
	canvas._chartjs = {
		initial: {
			height: renderHeight,
			width: renderWidth,
			style: {
				display: style.display,
				height: style.height,
				width: style.width
			}
		}
	};

	// Force canvas to display as block to avoid extra space caused by inline
	// elements, which would interfere with the responsive resize process.
	// https://github.com/chartjs/Chart.js/issues/2538
	style.display = style.display || 'block';

	if (renderWidth === null || renderWidth === '') {
		var displayWidth = readUsedSize(canvas, 'width');
		if (displayWidth !== undefined) {
			canvas.width = displayWidth;
		}
	}

	if (renderHeight === null || renderHeight === '') {
		if (canvas.style.height === '') {
			// If no explicit render height and style height, let's apply the aspect ratio,
			// which one can be specified by the user but also by charts as default option
			// (i.e. options.aspectRatio). If not specified, use canvas aspect ratio of 2.
			canvas.height = canvas.width / (config.options.aspectRatio || 2);
		} else {
			var displayHeight = readUsedSize(canvas, 'height');
			if (displayWidth !== undefined) {
				canvas.height = displayHeight;
			}
		}
	}

	return canvas;
}

/**
 * Restores the canvas initial state, such as render/display sizes and style.
 * TODO(SB) Move this method in the upcoming core.platform class.
 */
function releaseCanvas(canvas) {
	if (!canvas._chartjs) {
		return;
	}

	var initial = canvas._chartjs.initial;
	['height', 'width'].forEach(function(prop) {
		var value = initial[prop];
		if (value === undefined || value === null) {
			canvas.removeAttribute(prop);
		} else {
			canvas.setAttribute(prop, value);
		}
	});

	each(initial.style || {}, function(value, key) {
		canvas.style[key] = value;
	});

	delete canvas._chartjs;
}

/**
 * TODO(SB) Move this method in the upcoming core.platform class.
 */
function acquireContext(item, config) {
	if (typeof item === 'string') {
		item = document.getElementById(item);
	} else if (item.length) {
		// Support for array based queries (such as jQuery)
		item = item[0];
	}

	if (item && item.canvas) {
		// Support for any object associated to a canvas (including a context2d)
		item = item.canvas;
	}

	if (item instanceof HTMLCanvasElement) {
		// To prevent canvas fingerprinting, some add-ons undefine the getContext
		// method, for example: https://github.com/kkapsner/CanvasBlocker
		// https://github.com/chartjs/Chart.js/issues/2807
		var context = item.getContext && item.getContext('2d');
		if (context instanceof CanvasRenderingContext2D) {
			initCanvas(item, config);
			return context;
		}
	}

	return null;
}

/**
 * Initializes the given config with global and chart default values.
 */
function initConfig(config) {
	config = config || {};

	// Do NOT use configMerge() for the data object because this method merges arrays
	// and so would change references to labels and datasets, preventing data updates.
	var data = config.data = config.data || {};
	data.datasets = data.datasets || [];
	data.labels = data.labels || [];

	config.options = configMerge(
		defaults.global,
		defaults[config.type],
		config.options || {});

	return config;
}

/**
 * @class Chart.Controller
 * The main controller of a chart.
 */
export default class Controller {
	constructor(item, config, instance) {
		var me = this;
		config = initConfig(config);

		var context = acquireContext(item, config);
		var canvas = context && context.canvas;
		var height = canvas && canvas.height;
		var width = canvas && canvas.width;

		instance.ctx = context;
		instance.canvas = canvas;
		instance.config = config;
		instance.width = width;
		instance.height = height;
		instance.aspectRatio = height? width / height : null;

		me.id = uid();
		me.chart = instance;
		me.config = config;
		me.options = config.options;
		me._bufferedRender = false;

		// Add the chart instance to the global namespace
		Chart.instances[me.id] = me;

		if (!context || !canvas) {
			// The given item is not a compatible context2d element, let's return before finalizing
			// the chart initialization but after setting basic chart / controller properties that
			// can help to figure out that the chart is not valid (e.g chart.canvas !== null);
			// https://github.com/chartjs/Chart.js/issues/2807
			console.error("Failed to create chart: can't acquire context from the given item");
			return me;
		}

		retinaScale(instance);

		// Responsiveness is currently based on the use of an iframe, however this method causes
		// performance issues and could be troublesome when used with ad blockers. So make sure
		// that the user is still able to create a chart without iframe when responsive is false.
		// See https://github.com/chartjs/Chart.js/issues/2210
		if (me.options.responsive) {
			addResizeListener(canvas.parentNode, function() {
				me.resize();
			});

			// Initial resize before chart draws (must be silent to preserve initial animations).
			me.resize(true);
		}

		me.initialize();

		return me;
	}
	get data() {
		return this.config.data;
	}
	initialize() {
		var me = this;

		// Before init plugin notification
		plugins.notify('beforeInit', [me]);

		me.bindEvents();

		// Make sure controllers are built first so that each dataset is bound to an axis before the scales
		// are built
		me.ensureScalesHaveIDs();
		me.buildOrUpdateControllers();
		me.buildScales();
		me.updateLayout();
		me.resetElements();
		me.initToolTip();
		me.update();

		// After init plugin notification
		plugins.notify('afterInit', [me]);

		return me;
	}

	clear() {
		clear(this.chart);
		return this;
	}

	stop() {
		// Stops any current animation loop occurring
		animationService.cancelAnimation(this);
		return this;
	}

	resize(silent) {
		var me = this;
		var chart = me.chart;
		var options = me.options;
		var canvas = chart.canvas;
		var aspectRatio = (options.maintainAspectRatio && chart.aspectRatio) || null;

		// the canvas render width and height will be casted to integers so make sure that
		// the canvas display style uses the same integer values to avoid blurring effect.
		var newWidth = Math.floor(getMaximumWidth(canvas));
		var newHeight = Math.floor(aspectRatio? newWidth / aspectRatio : getMaximumHeight(canvas));

		if (chart.width === newWidth && chart.height === newHeight) {
			return;
		}

		canvas.width = chart.width = newWidth;
		canvas.height = chart.height = newHeight;

		retinaScale(chart);

		canvas.style.width = newWidth + 'px';
		canvas.style.height = newHeight + 'px';

		// Notify any plugins about the resize
		var newSize = {width: newWidth, height: newHeight};
		plugins.notify('resize', [me, newSize]);

		// Notify of resize
		if (me.options.onResize) {
			me.options.onResize(me, newSize);
		}

		if (!silent) {
			me.stop();
			me.update(me.options.responsiveAnimationDuration);
		}
	}

	ensureScalesHaveIDs() {
		var options = this.options;
		var scalesOptions = options.scales || {};
		var scaleOptions = options.scale;

		each(scalesOptions.xAxes, function(xAxisOptions, index) {
			xAxisOptions.id = xAxisOptions.id || ('x-axis-' + index);
		});

		each(scalesOptions.yAxes, function(yAxisOptions, index) {
			yAxisOptions.id = yAxisOptions.id || ('y-axis-' + index);
		});

		if (scaleOptions) {
			scaleOptions.id = scaleOptions.id || 'scale';
		}
	}

	/**
	 * Builds a map of scale ID to scale object for future lookup.
	 */
	buildScales() {
		var me = this;
		var options = me.options;
		var scales = me.scales = {};
		var items = [];
		if (options.scales) {
			items = items.concat(
				(options.scales.xAxes || []).map(function(xAxisOptions) {
					return {options: xAxisOptions, dtype: 'category'};
				}),
				(options.scales.yAxes || []).map(function(yAxisOptions) {
					return {options: yAxisOptions, dtype: 'linear'};
				})
			);
		}

		if (options.scale) {
			items.push({options: options.scale, dtype: 'radialLinear', isDefault: true});
		}

		each(items, function(item) {
			var scaleOptions = item.options;
			var scaleType = getValueOrDefault(scaleOptions.type, item.dtype);
			var scaleClass = scaleService.getScaleConstructor(scaleType);
			if (!scaleClass) {
				return;
			}

			var scale = new scaleClass({
				id: scaleOptions.id,
				options: scaleOptions,
				ctx: me.chart.ctx,
				chart: me
			});

			scales[scale.id] = scale;

			// TODO(SB): I think we should be able to remove this custom case (options.scale)
			// and consider it as a regular scale part of the "scales"" map only! This would
			// make the logic easier and remove some useless? custom code.
			if (item.isDefault) {
				me.scale = scale;
			}
		});

		scaleService.addScalesToLayout(this);
	}

	updateLayout() {
		layoutService.update(this, this.chart.width, this.chart.height);
	}

	buildOrUpdateControllers() {
		var me = this;
		var types = [];
		var newControllers = [];

		each(me.data.datasets, function(dataset, datasetIndex) {
			var meta = me.getDatasetMeta(datasetIndex);
			if (!meta.type) {
				meta.type = dataset.type || me.config.type;
			}

			types.push(meta.type);

			if (meta.controller) {
				meta.controller.updateIndex(datasetIndex);
			} else {
				meta.controller = new controllers[meta.type](me, datasetIndex);
				meta.controller.initialize();
				newControllers.push(meta.controller);
			}
		}, me);

		if (types.length > 1) {
			for (var i = 1; i < types.length; i++) {
				if (types[i] !== types[i - 1]) {
					me.isCombo = true;
					break;
				}
			}
		}

		return newControllers;
	}

	/**
	 * Reset the elements of all datasets
	 * @method resetElements
	 * @private
	 */
	resetElements() {
		var me = this;
		each(me.data.datasets, function(dataset, datasetIndex) {
			me.getDatasetMeta(datasetIndex).controller.reset();
		}, me);
	}

	/**
	* Resets the chart back to it's state before the initial animation
	* @method reset
	*/
	reset() {
		this.resetElements();
		this.tooltip.initialize();
	}

	update(animationDuration, lazy) {
		var me = this;
		plugins.notify('beforeUpdate', [me]);

		// In case the entire data object changed
		me.tooltip._data = me.data;

		// Make sure dataset controllers are updated and new controllers are reset
		var newControllers = me.buildOrUpdateControllers();

		// Make sure all dataset controllers have correct meta data counts
		each(me.data.datasets, function(dataset, datasetIndex) {
			me.getDatasetMeta(datasetIndex).controller.buildOrUpdateElements();
		}, me);

		layoutService.update(me, me.chart.width, me.chart.height);

		// Apply changes to the datasets that require the scales to have been calculated i.e BorderColor changes
		plugins.notify('afterScaleUpdate', [me]);

		// Can only reset the new controllers after the scales have been updated
		each(newControllers, function(controller) {
			controller.reset();
		});

		me.updateDatasets();

		// Do this before render so that any plugins that need final scale updates can use it
		plugins.notify('afterUpdate', [me]);

		if (me._bufferedRender) {
			me._bufferedRequest = {
				lazy: lazy,
				duration: animationDuration
			};
		} else {
			me.render(animationDuration, lazy);
		}
	}

	/**
	 * @method beforeDatasetsUpdate
	 * @description Called before all datasets are updated. If a plugin returns false,
	 * the datasets update will be cancelled until another chart update is triggered.
	 * @param {Object} instance the chart instance being updated.
	 * @returns {Boolean} false to cancel the datasets update.
	 * @memberof Chart.PluginBase
	 * @since version 2.1.5
	 * @instance
	 */

	/**
	 * @method afterDatasetsUpdate
	 * @description Called after all datasets have been updated. Note that this
	 * extension will not be called if the datasets update has been cancelled.
	 * @param {Object} instance the chart instance being updated.
	 * @memberof Chart.PluginBase
	 * @since version 2.1.5
	 * @instance
	 */

	/**
	 * Updates all datasets unless a plugin returns false to the beforeDatasetsUpdate
	 * extension, in which case no datasets will be updated and the afterDatasetsUpdate
	 * notification will be skipped.
	 * @protected
	 * @instance
	 */
	updateDatasets() {
		var me = this;
		var i, ilen;

		if (plugins.notify('beforeDatasetsUpdate', [me])) {
			for (i = 0, ilen = me.data.datasets.length; i < ilen; ++i) {
				me.getDatasetMeta(i).controller.update();
			}

			plugins.notify('afterDatasetsUpdate', [me]);
		}
	}

	render(duration, lazy) {
		var me = this;
		plugins.notify('beforeRender', [me]);

		var animationOptions = me.options.animation;
		if (animationOptions && ((typeof duration !== 'undefined' && duration !== 0) || (typeof duration === 'undefined' && animationOptions.duration !== 0))) {
			var animation = new Animation();
			animation.numSteps = (duration || animationOptions.duration) / 16.66; // 60 fps
			animation.easing = animationOptions.easing;

			// render function
			animation.render = function(chartInstance, animationObject) {
				var easingFunction = easingEffects[animationObject.easing];
				var stepDecimal = animationObject.currentStep / animationObject.numSteps;
				var easeDecimal = easingFunction(stepDecimal);

				chartInstance.draw(easeDecimal, stepDecimal, animationObject.currentStep);
			};

			// user events
			animation.onAnimationProgress = animationOptions.onProgress;
			animation.onAnimationComplete = animationOptions.onComplete;

			animationService.addAnimation(me, animation, duration, lazy);
		} else {
			me.draw();
			if (animationOptions && animationOptions.onComplete && animationOptions.onComplete.call) {
				animationOptions.onComplete.call(me);
			}
		}
		return me;
	}

	draw(ease) {
		var me = this;
		var easingDecimal = ease || 1;
		me.clear();

		plugins.notify('beforeDraw', [me, easingDecimal]);

		// Draw all the scales
		each(me.boxes, function(box) {
			box.draw(me.chartArea);
		}, me);
		if (me.scale) {
			me.scale.draw();
		}

		plugins.notify('beforeDatasetsDraw', [me, easingDecimal]);

		// Draw each dataset via its respective controller (reversed to support proper line stacking)
		each(me.data.datasets, function(dataset, datasetIndex) {
			if (me.isDatasetVisible(datasetIndex)) {
				me.getDatasetMeta(datasetIndex).controller.draw(ease);
			}
		}, me, true);

		plugins.notify('afterDatasetsDraw', [me, easingDecimal]);

		// Finally draw the tooltip
		me.tooltip.transition(easingDecimal).draw();

		plugins.notify('afterDraw', [me, easingDecimal]);
	}

	// Get the single element that was clicked on
	// @return : An object containing the dataset index and element index of the matching element. Also contains the rectangle that was draw
	getElementAtEvent(e) {
		return Interaction.modes.single(this, e);
	}

	getElementsAtEvent(e) {
		return Interaction.modes.label(this, e, {intersect: true});
	}

	getElementsAtXAxis(e) {
		return Interaction.modes['x-axis'](this, e, {intersect: true});
	}

	getElementsAtEventForMode(e, mode, options) {
		var method = Interaction.modes[mode];
		if (typeof method === 'function') {
			return method(this, e, options);
		}

		return [];
	}

	getDatasetAtEvent(e) {
		return Interaction.modes.dataset(this, e);
	}

	getDatasetMeta(datasetIndex) {
		var me = this;
		var dataset = me.data.datasets[datasetIndex];
		if (!dataset._meta) {
			dataset._meta = {};
		}

		var meta = dataset._meta[me.id];
		if (!meta) {
			meta = dataset._meta[me.id] = {
				type: null,
				data: [],
				dataset: null,
				controller: null,
				hidden: null,			// See isDatasetVisible() comment
				xAxisID: null,
				yAxisID: null
			};
		}

		return meta;
	}

	getVisibleDatasetCount() {
		var count = 0;
		for (var i = 0, ilen = this.data.datasets.length; i<ilen; ++i) {
			if (this.isDatasetVisible(i)) {
				count++;
			}
		}
		return count;
	}

	isDatasetVisible(datasetIndex) {
		var meta = this.getDatasetMeta(datasetIndex);

		// meta.hidden is a per chart dataset hidden flag override with 3 states: if true or false,
		// the dataset.hidden value is ignored, else if null, the dataset hidden state is returned.
		return typeof meta.hidden === 'boolean'? !meta.hidden : !this.data.datasets[datasetIndex].hidden;
	}

	generateLegend() {
		return this.options.legendCallback(this);
	}

	destroy() {
		var me = this;
		var canvas = me.chart.canvas;
		var meta, i, ilen;

		me.stop();

		// dataset controllers need to cleanup associated data
		for (i = 0, ilen = me.data.datasets.length; i < ilen; ++i) {
			meta = me.getDatasetMeta(i);
			if (meta.controller) {
				meta.controller.destroy();
				meta.controller = null;
			}
		}

		if (canvas) {
			unbindEvents(me, me.events);
			removeResizeListener(canvas.parentNode);
			clear(me.chart);
			releaseCanvas(canvas);
			me.chart.canvas = null;
			me.chart.ctx = null;
		}

		// if we scaled the canvas in response to a devicePixelRatio !== 1, we need to undo that transform here
		if (me.chart.originalDevicePixelRatio !== undefined) {
			me.chart.ctx.scale(1 / me.chart.originalDevicePixelRatio, 1 / me.chart.originalDevicePixelRatio);
		}

		plugins.notify('destroy', [me]);

		delete Chart.instances[me.id];
	}

	toBase64Image() {
		return this.chart.canvas.toDataURL.apply(this.chart.canvas, arguments);
	}

	initToolTip() {
		var me = this;
		me.tooltip = new Tooltip({
			_chart: me.chart,
			_chartInstance: me,
			_data: me.data,
			_options: me.options.tooltips
		}, me);
		// me.tooltip.initialize();
	}

	bindEvents() {
		var me = this;
		bindEvents(me, me.options.events, function(evt) {
			me.eventHandler(evt);
		});
	}

	updateHoverStyle(elements, mode, enabled) {
		var method = enabled? 'setHoverStyle' : 'removeHoverStyle';
		var element, i, ilen;

		for (i=0, ilen=elements.length; i<ilen; ++i) {
			element = elements[i];
			if (element) {
				this.getDatasetMeta(element._datasetIndex).controller[method](element);
			}
		}
	}

	eventHandler(e) {
		var me = this;
		var hoverOptions = me.options.hover;

		// Buffer any update calls so that renders do not occur
		me._bufferedRender = true;
		me._bufferedRequest = null;

		var changed = me.handleEvent(e);
		changed |= me.legend.handleEvent(e);
		changed |= me.tooltip.handleEvent(e);

		var bufferedRequest = me._bufferedRequest;
		if (bufferedRequest) {
			// If we have an update that was triggered, we need to do a normal render
			me.render(bufferedRequest.duration, bufferedRequest.lazy);
		} else if (changed && !me.animating) {
			// If entering, leaving, or changing elements, animate the change via pivot
			me.stop();

			// We only need to render at this point. Updating will cause scales to be
			// recomputed generating flicker & using more memory than necessary.
			me.render(hoverOptions.animationDuration, true);
		}

		me._bufferedRender = false;
		me._bufferedRequest = null;

		return me;
	}

	/**
	 * Handle an event
	 * @private
	 * param e {Event} the event to handle
	 * @return {Boolean} true if the chart needs to re-render
	 */
	handleEvent(e) {
		var me = this;
		var options = me.options || {};
		var hoverOptions = options.hover;
		var changed = false;

		me.lastActive = me.lastActive || [];

		// Find Active Elements for hover and tooltips
		if (e.type === 'mouseout') {
			me.active = [];
		} else {
			me.active = me.getElementsAtEventForMode(e, hoverOptions.mode, hoverOptions);
		}

		// On Hover hook
		if (hoverOptions.onHover) {
			hoverOptions.onHover.call(me, me.active);
		}

		if (e.type === 'mouseup' || e.type === 'click') {
			if (options.onClick) {
				options.onClick.call(me, e, me.active);
			}
		}

		// Remove styling for last active (even if it may still be active)
		if (me.lastActive.length) {
			me.updateHoverStyle(me.lastActive, hoverOptions.mode, false);
		}

		// Built in hover styling
		if (me.active.length && hoverOptions.mode) {
			me.updateHoverStyle(me.active, hoverOptions.mode, true);
		}

		changed = !arrayEquals(me.active, me.lastActive);

		// Remember Last Actives
		me.lastActive = me.active;

		return changed;
	}
}
