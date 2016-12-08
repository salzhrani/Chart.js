import {
	indexOf
} from '../core/core.helpers';
import Scale from '../core/core.scale';
import scaleService from '../core/core.scaleService';

// Default config for a category scale
var defaultConfig = {
	position: 'bottom'
};

export default class DatasetScale extends Scale {
	/**
	* Internal function to get the correct labels. If data.xLabels or data.yLabels are defined, use those
	* else fall back to data.labels
	* @private
	*/
	getLabels() {
		var data = this.chart.data;
		return (this.isHorizontal() ? data.xLabels : data.yLabels) || data.labels;
	}
	// Implement this so that
	determineDataLimits() {
		var me = this;
		var labels = me.getLabels();
		me.minIndex = 0;
		me.maxIndex = labels.length - 1;
		var findIndex;

		if (me.options.ticks.min !== undefined) {
			// user specified min value
			findIndex = indexOf(labels, me.options.ticks.min);
			me.minIndex = findIndex !== -1 ? findIndex : me.minIndex;
		}

		if (me.options.ticks.max !== undefined) {
			// user specified max value
			findIndex = indexOf(labels, me.options.ticks.max);
			me.maxIndex = findIndex !== -1 ? findIndex : me.maxIndex;
		}

		me.min = labels[me.minIndex];
		me.max = labels[me.maxIndex];
	}

	buildTicks() {
		var me = this;
		var labels = me.getLabels();
		// If we are viewing some subset of labels, slice the original array
		me.ticks = (me.minIndex === 0 && me.maxIndex === labels.length - 1) ? labels : labels.slice(me.minIndex, me.maxIndex + 1);
	}

	getLabelForIndex(index, datasetIndex) {
		var me = this;
		var data = me.chart.data;
		var isHorizontal = me.isHorizontal();

		if (data.yLabels && !isHorizontal) {
			return me.getRightValue(data.datasets[datasetIndex].data[index]);
		}
		return me.ticks[index - me.minIndex];
	}

	// Used to get data value locations.  Value can either be an index or a numerical value
	getPixelForValue(value, index, datasetIndex, includeOffset) {
		var me = this;
		// 1 is added because we need the length but we have the indexes
		var offsetAmt = Math.max((me.maxIndex + 1 - me.minIndex - ((me.options.gridLines.offsetGridLines) ? 0 : 1)), 1);

		if (value !== undefined && isNaN(index)) {
			var labels = me.getLabels();
			var idx = labels.indexOf(value);
			index = idx !== -1 ? idx : index;
		}

		if (me.isHorizontal()) {
			var valueWidth = me.width / offsetAmt;
			var widthOffset = (valueWidth * (index - me.minIndex));

			if (me.options.gridLines.offsetGridLines && includeOffset || me.maxIndex === me.minIndex && includeOffset) {
				widthOffset += (valueWidth / 2);
			}

			return me.left + Math.round(widthOffset);
		}
		var valueHeight = me.height / offsetAmt;
		var heightOffset = (valueHeight * (index - me.minIndex));

		if (me.options.gridLines.offsetGridLines && includeOffset) {
			heightOffset += (valueHeight / 2);
		}

		return me.top + Math.round(heightOffset);
	}
	getPixelForTick(index, includeOffset) {
		return this.getPixelForValue(this.ticks[index], index + this.minIndex, null, includeOffset);
	}
	getValueForPixel(pixel) {
		var me = this;
		var value;
		var offsetAmt = Math.max((me.ticks.length - ((me.options.gridLines.offsetGridLines) ? 0 : 1)), 1);
		var horz = me.isHorizontal();
		var valueDimension = (horz ? me.width : me.height) / offsetAmt;

		pixel -= horz ? me.left : me.top;

		if (me.options.gridLines.offsetGridLines) {
			pixel -= (valueDimension / 2);
		}

		if (pixel <= 0) {
			value = 0;
		} else {
			value = Math.round(pixel / valueDimension);
		}

		return value;
	}
	getBasePixel() {
		return this.bottom;
	}
}

scaleService.registerScaleType('category', DatasetScale, defaultConfig);
