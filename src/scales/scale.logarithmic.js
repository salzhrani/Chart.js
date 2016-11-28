import {
	getValueOrDefault,
	each,
	min,
	max,
	log10,
} from '../core/core.helpers';
import Scale from '../core/core.scale';
import Ticks from '../core/core.ticks';
import scaleService from '../core/core.scaleService';

var defaultConfig = {
	position: 'left',

	// label settings
	ticks: {
		callback: Ticks.formatters.logarithmic
	}
};

export default class LogarithmicScale extends Scale {
	determineDataLimits() {
		var me = this;
		var opts = me.options;
		var tickOpts = opts.ticks;
		var chart = me.chart;
		var data = chart.data;
		var datasets = data.datasets;
		var isHorizontal = me.isHorizontal();
		function IDMatches(meta) {
			return isHorizontal ? meta.xAxisID === me.id : meta.yAxisID === me.id;
		}

		// Calculate Range
		me.min = null;
		me.max = null;
		me.minNotZero = null;

		if (opts.stacked) {
			var valuesPerType = {};

			each(datasets, function(dataset, datasetIndex) {
				var meta = chart.getDatasetMeta(datasetIndex);
				if (chart.isDatasetVisible(datasetIndex) && IDMatches(meta)) {
					if (valuesPerType[meta.type] === undefined) {
						valuesPerType[meta.type] = [];
					}

					each(dataset.data, function(rawValue, index) {
						var values = valuesPerType[meta.type];
						var value = +me.getRightValue(rawValue);
						if (isNaN(value) || meta.data[index].hidden) {
							return;
						}

						values[index] = values[index] || 0;

						if (opts.relativePoints) {
							values[index] = 100;
						} else {
							// Don't need to split positive and negative since the log scale can't handle a 0 crossing
							values[index] += value;
						}
					});
				}
			});

			each(valuesPerType, function(valuesForType) {
				var minVal = min(valuesForType);
				var maxVal = max(valuesForType);
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

						if (value !== 0 && (me.minNotZero === null || value < me.minNotZero)) {
							me.minNotZero = value;
						}
					});
				}
			});
		}

		me.min = getValueOrDefault(tickOpts.min, me.min);
		me.max = getValueOrDefault(tickOpts.max, me.max);

		if (me.min === me.max) {
			if (me.min !== 0 && me.min !== null) {
				me.min = Math.pow(10, Math.floor(log10(me.min)) - 1);
				me.max = Math.pow(10, Math.floor(log10(me.max)) + 1);
			} else {
				me.min = 1;
				me.max = 10;
			}
		}
	}
	buildTicks() {
		var me = this;
		var opts = me.options;
		var tickOpts = opts.ticks;

		var generationOptions = {
			min: tickOpts.min,
			max: tickOpts.max
		};
		var ticks = me.ticks = Ticks.generators.logarithmic(generationOptions, me);

		if (!me.isHorizontal()) {
			// We are in a vertical orientation. The top value is the highest. So reverse the array
			ticks.reverse();
		}

		// At this point, we need to update our max and min given the tick values since we have expanded the
		// range of the scale
		me.max = max(ticks);
		me.min = min(ticks);

		if (tickOpts.reverse) {
			ticks.reverse();

			me.start = me.max;
			me.end = me.min;
		} else {
			me.start = me.min;
			me.end = me.max;
		}
	}
	convertTicksToLabels() {
		this.tickValues = this.ticks.slice();

		Scale.prototype.convertTicksToLabels.call(this);
	}
	// Get the correct tooltip label
	getLabelForIndex(index, datasetIndex) {
		return +this.getRightValue(this.chart.data.datasets[datasetIndex].data[index]);
	}
	getPixelForTick(index) {
		return this.getPixelForValue(this.tickValues[index]);
	}
	getPixelForValue(value) {
		var me = this;
		var innerDimension;
		var pixel;

		var start = me.start;
		var newVal = +me.getRightValue(value);
		var range;
		var paddingTop = me.paddingTop;
		var paddingBottom = me.paddingBottom;
		var paddingLeft = me.paddingLeft;
		var opts = me.options;
		var tickOpts = opts.ticks;

		if (me.isHorizontal()) {
			range = log10(me.end) - log10(start); // todo: if start === 0
			if (newVal === 0) {
				pixel = me.left + paddingLeft;
			} else {
				innerDimension = me.width - (paddingLeft + me.paddingRight);
				pixel = me.left + (innerDimension / range * (log10(newVal) - log10(start)));
				pixel += paddingLeft;
			}
		} else {
			// Bottom - top since pixels increase downward on a screen
			innerDimension = me.height - (paddingTop + paddingBottom);
			if (start === 0 && !tickOpts.reverse) {
				range = log10(me.end) - log10(me.minNotZero);
				if (newVal === start) {
					pixel = me.bottom - paddingBottom;
				} else if (newVal === me.minNotZero) {
					pixel = me.bottom - paddingBottom - innerDimension * 0.02;
				} else {
					pixel = me.bottom - paddingBottom - innerDimension * 0.02 - (innerDimension * 0.98/ range * (log10(newVal)-log10(me.minNotZero)));
				}
			} else if (me.end === 0 && tickOpts.reverse) {
				range = log10(me.start) - log10(me.minNotZero);
				if (newVal === me.end) {
					pixel = me.top + paddingTop;
				} else if (newVal === me.minNotZero) {
					pixel = me.top + paddingTop + innerDimension * 0.02;
				} else {
					pixel = me.top + paddingTop + innerDimension * 0.02 + (innerDimension * 0.98/ range * (log10(newVal)-log10(me.minNotZero)));
				}
			} else {
				range = log10(me.end) - log10(start);
				innerDimension = me.height - (paddingTop + paddingBottom);
				pixel = (me.bottom - paddingBottom) - (innerDimension / range * (log10(newVal) - log10(start)));
			}
		}
		return pixel;
	}
	getValueForPixel(pixel) {
		var me = this;
		var range = log10(me.end) - log10(me.start);
		var value, innerDimension;

		if (me.isHorizontal()) {
			innerDimension = me.width - (me.paddingLeft + me.paddingRight);
			value = me.start * Math.pow(10, (pixel - me.left - me.paddingLeft) * range / innerDimension);
		} else {  // todo: if start === 0
			innerDimension = me.height - (me.paddingTop + me.paddingBottom);
			value = Math.pow(10, (me.bottom - me.paddingBottom - pixel) * range / innerDimension) / me.start;
		}
		return value;
	}
}
scaleService.registerScaleType('logarithmic', LogarithmicScale, defaultConfig);
