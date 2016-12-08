import {
	each,
	getValueAtIndexOrDefault,
	extend,
} from '../core/core.helpers';
import Point from '../elements/element.point';
import DatasetController from '../core/core.datasetController';
import defaults from '../core/core.defaults';

defaults.bubble = {
	hover: {
		mode: 'single'
	},

	scales: {
		xAxes: [{
			type: 'linear', // bubble should probably use a linear scale by default
			position: 'bottom',
			id: 'x-axis-0' // need an ID so datasets can reference the scale
		}],
		yAxes: [{
			type: 'linear',
			position: 'left',
			id: 'y-axis-0'
		}]
	},

	tooltips: {
		callbacks: {
			title() {
				// Title doesn't make sense for scatter since we format the data as a point
				return '';
			},
			label(tooltipItem, data) {
				var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
				var dataPoint = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
				return datasetLabel + ': (' + tooltipItem.xLabel + ', ' + tooltipItem.yLabel + ', ' + dataPoint.r + ')';
			}
		}
	}
};

export default class BubbleController extends DatasetController {

	dataElementType = Point

	update(reset) {
		var me = this;
		var meta = me.getMeta();
		var points = meta.data;

		// Update Points
		each(points, function(point, index) {
			me.updateElement(point, index, reset);
		});
	}

	updateElement(point, index, reset) {
		var me = this;
		var meta = me.getMeta();
		var xScale = me.getScaleForId(meta.xAxisID);
		var yScale = me.getScaleForId(meta.yAxisID);

		var custom = point.custom || {};
		var dataset = me.getDataset();
		var data = dataset.data[index];
		var pointElementOptions = me.chart.options.elements.point;
		var dsIndex = me.index;

		extend(point, {
			// Utility
			_xScale: xScale,
			_yScale: yScale,
			_datasetIndex: dsIndex,
			_index: index,

			// Desired view properties
			_model: {
				x: reset ? xScale.getPixelForDecimal(0.5) : xScale.getPixelForValue(typeof data === 'object' ? data : NaN, index, dsIndex, me.chart.isCombo),
				y: reset ? yScale.getBasePixel() : yScale.getPixelForValue(data, index, dsIndex),
				// Appearance
				radius: reset ? 0 : custom.radius ? custom.radius : me.getRadius(data),

				// Tooltip
				hitRadius: custom.hitRadius ? custom.hitRadius : getValueAtIndexOrDefault(dataset.hitRadius, index, pointElementOptions.hitRadius)
			}
		});

		// Trick to reset the styles of the point
		DatasetController.prototype.removeHoverStyle.call(me, point, pointElementOptions);

		var model = point._model;
		model.skip = custom.skip ? custom.skip : (isNaN(model.x) || isNaN(model.y));

		point.pivot();
	}

	getRadius(value) {
		return value.r || this.chart.options.elements.point.radius;
	}

	setHoverStyle(point) {
		var me = this;
		DatasetController.prototype.setHoverStyle.call(me, point);

		// Radius
		var dataset = me.chart.data.datasets[point._datasetIndex];
		var index = point._index;
		var custom = point.custom || {};
		var model = point._model;
		model.radius = custom.hoverRadius ? custom.hoverRadius : (getValueAtIndexOrDefault(dataset.hoverRadius, index, me.chart.options.elements.point.hoverRadius)) + me.getRadius(dataset.data[index]);
	}

	removeHoverStyle(point) {
		var me = this;
		DatasetController.prototype.removeHoverStyle.call(me, point, me.chart.options.elements.point);

		var dataVal = me.chart.data.datasets[point._datasetIndex].data[point._index];
		var custom = point.custom || {};
		var model = point._model;

		model.radius = custom.radius ? custom.radius : me.getRadius(dataVal);
	}
}
