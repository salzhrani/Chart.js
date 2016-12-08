import {
	each,
	min,
	max,
	getValueOrDefault
} from '../core/core.helpers';
import LinearScaleBase from './scale.linearbase';
import Ticks from '../core/core.ticks';
import scaleService from '../core/core.scaleService';
import defaults from '../core/core.defaults';

var defaultConfig = {
	position: 'left',
	ticks: {
		callback: Ticks.formatters.linear
	}
};

export default class LinearScale extends LinearScaleBase {
	determineDataLimits() {
		var me = this;
		var opts = me.options;
		var chart = me.chart;
		var data = chart.data;
		var datasets = data.datasets;
		var isHorizontal = me.isHorizontal();

		function IDMatches(meta) {
			return isHorizontal ? meta.xAxisID === me.id : meta.yAxisID === me.id;
		}

		// First Calculate the range
		me.min = null;
		me.max = null;

		if (opts.stacked) {
			var valuesPerType = {};

			each(datasets, function(dataset, datasetIndex) {
				var meta = chart.getDatasetMeta(datasetIndex);
				if (valuesPerType[meta.type] === undefined) {
					valuesPerType[meta.type] = {
						positiveValues: [],
						negativeValues: []
					};
				}

				// Store these per type
				var positiveValues = valuesPerType[meta.type].positiveValues;
				var negativeValues = valuesPerType[meta.type].negativeValues;

				if (chart.isDatasetVisible(datasetIndex) && IDMatches(meta)) {
					each(dataset.data, function(rawValue, index) {
						var value = +me.getRightValue(rawValue);
						if (isNaN(value) || meta.data[index].hidden) {
							return;
						}

						positiveValues[index] = positiveValues[index] || 0;
						negativeValues[index] = negativeValues[index] || 0;

						if (opts.relativePoints) {
							positiveValues[index] = 100;
						} else if (value < 0) {
							negativeValues[index] += value;
						} else {
							positiveValues[index] += value;
						}
					});
				}
			});

			each(valuesPerType, function(valuesForType) {
				var values = valuesForType.positiveValues.concat(valuesForType.negativeValues);
				var minVal = min(values);
				var maxVal = max(values);
				me.min = me.min === null ? minVal : Math.min(me.min, minVal);
				me.max = me.max === null ? maxVal : Math.max(me.max, maxVal);
			});

		} else {
			each(datasets, function(dataset, datasetIndex) {
				var meta = chart.getDatasetMeta(datasetIndex);
				if (chart.isDatasetVisible(datasetIndex) && IDMatches(meta)) {
					each(dataset.data, function(rawValue, index) {
						var value = +me.getRightValue(rawValue);
						if (isNaN(value) || meta.data[index].hidden) {
							return;
						}

						if (me.min === null) {
							me.min = value;
						} else if (value < me.min) {
							me.min = value;
						}

						if (me.max === null) {
							me.max = value;
						} else if (value > me.max) {
							me.max = value;
						}
					});
				}
			});
		}

		// Common base implementation to handle ticks.min, ticks.max, ticks.beginAtZero
		this.handleTickRangeOptions();
	}
	getTickLimit() {
		var maxTicks;
		var me = this;
		var tickOpts = me.options.ticks;

		if (me.isHorizontal()) {
			maxTicks = Math.min(tickOpts.maxTicksLimit ? tickOpts.maxTicksLimit : 11, Math.ceil(me.width / 50));
		} else {
			// The factor of 2 used to scale the font size has been experimentally determined.
			var tickFontSize = getValueOrDefault(tickOpts.fontSize, defaults.global.defaultFontSize);
			maxTicks = Math.min(tickOpts.maxTicksLimit ? tickOpts.maxTicksLimit : 11, Math.ceil(me.height / (2 * tickFontSize)));
		}

		return maxTicks;
	}
	// Called after the ticks are built. We need
	handleDirectionalChanges() {
		if (!this.isHorizontal()) {
			// We are in a vertical orientation. The top value is the highest. So reverse the array
			this.ticks.reverse();
		}
	}
	getLabelForIndex(index, datasetIndex) {
		return +this.getRightValue(this.chart.data.datasets[datasetIndex].data[index]);
	}
	// Utils
	getPixelForValue(value) {
		// This must be called after fit has been run so that
		// this.left, this.top, this.right, and this.bottom have been defined
		var me = this;
		var start = me.start;

		var rightValue = +me.getRightValue(value);
		var pixel;
		var range = me.end - start;

		if (me.isHorizontal()) {
			pixel = me.left + (me.width / range * (rightValue - start));
			return Math.round(pixel);
		}

		pixel = me.bottom - (me.height / range * (rightValue - start));
		return Math.round(pixel);
	}
	getValueForPixel(pixel) {
		var me = this;
		var isHorizontal = me.isHorizontal();
		var innerDimension = isHorizontal ? me.width : me.height;
		var offset = (isHorizontal ? pixel - me.left : me.bottom - pixel) / innerDimension;
		return me.start + ((me.end - me.start) * offset);
	}
	getPixelForTick(index) {
		return this.getPixelForValue(this.ticksAsNumbers[index]);
	}
}
scaleService.registerScaleType('linear', LinearScale, defaultConfig);
