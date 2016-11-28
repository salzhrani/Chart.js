'use strict';
import {each, getValueAtIndexOrDefault, getHoverColor} from './core.helpers';

const arrayEvents = ['push', 'pop', 'shift', 'splice', 'unshift'];

/**
 * Hooks the array methods that add or remove values ('push', pop', 'shift', 'splice',
 * 'unshift') and notify the listener AFTER the array has been altered. Listeners are
 * called on the 'onData*' callbacks (e.g. onDataPush, etc.) with same arguments.
 */
function listenArrayEvents(array, listener) {
	if (array._chartjs) {
		array._chartjs.listeners.push(listener);
		return;
	}

	Object.defineProperty(array, '_chartjs', {
		configurable: true,
		enumerable: false,
		value: {
			listeners: [listener]
		}
	});

	arrayEvents.forEach(function(key) {
		var method = 'onData' + key.charAt(0).toUpperCase() + key.slice(1);
		var base = array[key];

		Object.defineProperty(array, key, {
			configurable: true,
			enumerable: false,
			value() {
				var args = Array.prototype.slice.call(arguments);
				var res = base.apply(this, args);

				each(array._chartjs.listeners, function(object) {
					if (typeof object[method] === 'function') {
						object[method].apply(object, args);
					}
				});

				return res;
			}
		});
	});
}

/**
 * Removes the given array event listener and cleanup extra attached properties (such as
 * the _chartjs stub and overridden methods) if array doesn't have any more listeners.
 */
function unlistenArrayEvents(array, listener) {
	var stub = array._chartjs;
	if (!stub) {
		return;
	}

	var listeners = stub.listeners;
	var index = listeners.indexOf(listener);
	if (index !== -1) {
		listeners.splice(index, 1);
	}

	if (listeners.length > 0) {
		return;
	}

	arrayEvents.forEach(function(key) {
		delete array[key];
	});

	delete array._chartjs;
}

// Base class for all dataset controllers (line, bar, etc)
export default class DatasetController {
	constructor(chart, datasetIndex) {
		// this.initialize(chart, datasetIndex);
		var me = this;
		me.chart = chart;
		me.index = datasetIndex;
		/**
		 * Element type used to generate a meta dataset (e.g. Chart.element.Line).
		 * @type {Chart.core.element}
		 */
		me.datasetElementType = null;

		/**
		 * Element type used to generate a meta data (e.g. Chart.element.Point).
		 * @type {Chart.core.element}
		 */
		me.dataElementType = null;
	}

	initialize() {
		var me = this;
		me.linkScales();
		me.addElements();
	}

	updateIndex(datasetIndex) {
		this.index = datasetIndex;
	}

	linkScales() {
		var me = this;
		var meta = me.getMeta();
		var dataset = me.getDataset();

		if (meta.xAxisID === null) {
			meta.xAxisID = dataset.xAxisID || me.chart.options.scales.xAxes[0].id;
		}
		if (meta.yAxisID === null) {
			meta.yAxisID = dataset.yAxisID || me.chart.options.scales.yAxes[0].id;
		}
	}

	getDataset() {
		return this.chart.data.datasets[this.index];
	}

	getMeta() {
		return this.chart.getDatasetMeta(this.index);
	}

	getScaleForId(scaleID) {
		return this.chart.scales[scaleID];
	}

	reset() {
		this.update(true);
	}

	/**
	 * @private
	 */
	destroy() {
		if (this._data) {
			unlistenArrayEvents(this._data, this);
		}
	}

	createMetaDataset() {
		var me = this;
		var type = me.datasetElementType;
		return type && new type({
			_chart: me.chart.chart,
			_datasetIndex: me.index
		});
	}

	createMetaData(index) {
		var me = this;
		var type = me.dataElementType;
		return type && new type({
			_chart: me.chart.chart,
			_datasetIndex: me.index,
			_index: index
		});
	}

	addElements() {
		var me = this;
		var meta = me.getMeta();
		var data = me.getDataset().data || [];
		var metaData = meta.data;
		var i, ilen;

		for (i=0, ilen=data.length; i<ilen; ++i) {
			metaData[i] = metaData[i] || me.createMetaData(i);
		}

		meta.dataset = meta.dataset || me.createMetaDataset();
	}

	addElementAndReset(index) {
		var element = this.createMetaData(index);
		this.getMeta().data.splice(index, 0, element);
		this.updateElement(element, index, true);
	}

	buildOrUpdateElements() {
		var me = this;
		var dataset = me.getDataset();
		var data = dataset.data || (dataset.data = []);

		// In order to correctly handle data addition/deletion animation (an thus simulate
		// real-time charts), we need to monitor these data modifications and synchronize
		// the internal meta data accordingly.
		if (me._data !== data) {
			if (me._data) {
				// This case happens when the user replaced the data array instance.
				unlistenArrayEvents(me._data, me);
			}

			listenArrayEvents(data, me);
			me._data = data;
		}

		// Re-sync meta data in case the user replaced the data array or if we missed
		// any updates and so make sure that we handle number of datapoints changing.
		me.resyncElements();
	}

	update() {
		return null;
	}

	draw(ease) {
		var easingDecimal = ease || 1;
		var i, len;
		var metaData = this.getMeta().data;
		for (i = 0, len = metaData.length; i < len; ++i) {
			metaData[i].transition(easingDecimal).draw();
		}
	}

	removeHoverStyle(element, elementOpts) {
		var dataset = this.chart.data.datasets[element._datasetIndex],
			index = element._index,
			custom = element.custom || {},
			valueOrDefault = getValueAtIndexOrDefault,
			model = element._model;

		model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : valueOrDefault(dataset.backgroundColor, index, elementOpts.backgroundColor);
		model.borderColor = custom.borderColor ? custom.borderColor : valueOrDefault(dataset.borderColor, index, elementOpts.borderColor);
		model.borderWidth = custom.borderWidth ? custom.borderWidth : valueOrDefault(dataset.borderWidth, index, elementOpts.borderWidth);
	}

	setHoverStyle(element) {
		var dataset = this.chart.data.datasets[element._datasetIndex],
			index = element._index,
			custom = element.custom || {},
			valueOrDefault = getValueAtIndexOrDefault,
			model = element._model;

		model.backgroundColor = custom.hoverBackgroundColor ? custom.hoverBackgroundColor : valueOrDefault(dataset.hoverBackgroundColor, index, getHoverColor(model.backgroundColor));
		model.borderColor = custom.hoverBorderColor ? custom.hoverBorderColor : valueOrDefault(dataset.hoverBorderColor, index, getHoverColor(model.borderColor));
		model.borderWidth = custom.hoverBorderWidth ? custom.hoverBorderWidth : valueOrDefault(dataset.hoverBorderWidth, index, model.borderWidth);
	}

	/**
	 * @private
	 */
	resyncElements() {
		var me = this;
		var meta = me.getMeta();
		var data = me.getDataset().data;
		var numMeta = meta.data.length;
		var numData = data.length;

		if (numData < numMeta) {
			meta.data.splice(numData, numMeta - numData);
		} else if (numData > numMeta) {
			me.insertElements(numMeta, numData - numMeta);
		}
	}

	/**
	 * @private
	 */
	insertElements(start, count) {
		for (var i=0; i<count; ++i) {
			this.addElementAndReset(start + i);
		}
	}

	/**
	 * @private
	 */
	onDataPush() {
		this.insertElements(this.getDataset().data.length-1, arguments.length);
	}

	/**
	 * @private
	 */
	onDataPop() {
		this.getMeta().data.pop();
	}

	/**
	 * @private
	 */
	onDataShift() {
		this.getMeta().data.shift();
	}

	/**
	 * @private
	 */
	onDataSplice(start, count) {
		this.getMeta().data.splice(start, count);
		this.insertElements(start, arguments.length - 2);
	}

	/**
	 * @private
	 */
	onDataUnshift() {
		this.insertElements(0, arguments.length);
	}
}
