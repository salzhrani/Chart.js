import {
	getValueOrDefault,
	getValueAtIndexOrDefault,
	splineCurve,
	previousItem,
	nextItem,
	getHoverColor,
	extend,
	each,
} from '../core/core.helpers';
import Point from '../elements/element.point';
import Line from '../elements/element.line';
import DatasetController from '../core/core.datasetController';
import defaults from '../core/core.defaults';

defaults.radar = {
	aspectRatio: 1,
	scale: {
		type: 'radialLinear'
	},
	elements: {
		line: {
			tension: 0 // no bezier in radar
		}
	}
};

export default class RadarController extends DatasetController {

	datasetElementType = Line

	dataElementType = Point

	linkScales() {}

	update(reset) {
		var me = this;
		var meta = me.getMeta();
		var line = meta.dataset;
		var points = meta.data;
		var custom = line.custom || {};
		var dataset = me.getDataset();
		var lineElementOptions = me.chart.options.elements.line;
		var scale = me.chart.scale;

		// Compatibility: If the properties are defined with only the old name, use those values
		if ((dataset.tension !== undefined) && (dataset.lineTension === undefined)) {
			dataset.lineTension = dataset.tension;
		}

		extend(meta.dataset, {
			// Utility
			_datasetIndex: me.index,
			// Data
			_children: points,
			_loop: true,
			// Model
			_model: {
				// Appearance
				tension: custom.tension ? custom.tension : getValueOrDefault(dataset.lineTension, lineElementOptions.tension),
				backgroundColor: custom.backgroundColor ? custom.backgroundColor : (dataset.backgroundColor || lineElementOptions.backgroundColor),
				borderWidth: custom.borderWidth ? custom.borderWidth : (dataset.borderWidth || lineElementOptions.borderWidth),
				borderColor: custom.borderColor ? custom.borderColor : (dataset.borderColor || lineElementOptions.borderColor),
				fill: custom.fill ? custom.fill : (dataset.fill !== undefined ? dataset.fill : lineElementOptions.fill),
				borderCapStyle: custom.borderCapStyle ? custom.borderCapStyle : (dataset.borderCapStyle || lineElementOptions.borderCapStyle),
				borderDash: custom.borderDash ? custom.borderDash : (dataset.borderDash || lineElementOptions.borderDash),
				borderDashOffset: custom.borderDashOffset ? custom.borderDashOffset : (dataset.borderDashOffset || lineElementOptions.borderDashOffset),
				borderJoinStyle: custom.borderJoinStyle ? custom.borderJoinStyle : (dataset.borderJoinStyle || lineElementOptions.borderJoinStyle),

				// Scale
				scaleTop: scale.top,
				scaleBottom: scale.bottom,
				scaleZero: scale.getBasePosition()
			}
		});

		meta.dataset.pivot();

		// Update Points
		each(points, function(point, index) {
			me.updateElement(point, index, reset);
		}, me);

		// Update bezier control points
		me.updateBezierControlPoints();
	}
	updateElement(point, index, reset) {
		var me = this;
		var custom = point.custom || {};
		var dataset = me.getDataset();
		var scale = me.chart.scale;
		var pointElementOptions = me.chart.options.elements.point;
		var pointPosition = scale.getPointPositionForValue(index, dataset.data[index]);

		extend(point, {
			// Utility
			_datasetIndex: me.index,
			_index: index,
			_scale: scale,

			// Desired view properties
			_model: {
				x: reset ? scale.xCenter : pointPosition.x, // value not used in dataset scale, but we want a consistent API between scales
				y: reset ? scale.yCenter : pointPosition.y,

				// Appearance
				tension: custom.tension ? custom.tension : getValueOrDefault(dataset.lineTension, me.chart.options.elements.line.tension),
				radius: custom.radius ? custom.radius : getValueAtIndexOrDefault(dataset.pointRadius, index, pointElementOptions.radius),
				backgroundColor: custom.backgroundColor ? custom.backgroundColor : getValueAtIndexOrDefault(dataset.pointBackgroundColor, index, pointElementOptions.backgroundColor),
				borderColor: custom.borderColor ? custom.borderColor : getValueAtIndexOrDefault(dataset.pointBorderColor, index, pointElementOptions.borderColor),
				borderWidth: custom.borderWidth ? custom.borderWidth : getValueAtIndexOrDefault(dataset.pointBorderWidth, index, pointElementOptions.borderWidth),
				pointStyle: custom.pointStyle ? custom.pointStyle : getValueAtIndexOrDefault(dataset.pointStyle, index, pointElementOptions.pointStyle),

				// Tooltip
				hitRadius: custom.hitRadius ? custom.hitRadius : getValueAtIndexOrDefault(dataset.hitRadius, index, pointElementOptions.hitRadius)
			}
		});

		point._model.skip = custom.skip ? custom.skip : (isNaN(point._model.x) || isNaN(point._model.y));
	}
	updateBezierControlPoints() {
		var chartArea = this.chart.chartArea;
		var meta = this.getMeta();

		each(meta.data, function(point, index) {
			var model = point._model;
			var controlPoints = splineCurve(
				previousItem(meta.data, index, true)._model,
				model,
				nextItem(meta.data, index, true)._model,
				model.tension
			);

			// Prevent the bezier going outside of the bounds of the graph
			model.controlPointPreviousX = Math.max(Math.min(controlPoints.previous.x, chartArea.right), chartArea.left);
			model.controlPointPreviousY = Math.max(Math.min(controlPoints.previous.y, chartArea.bottom), chartArea.top);

			model.controlPointNextX = Math.max(Math.min(controlPoints.next.x, chartArea.right), chartArea.left);
			model.controlPointNextY = Math.max(Math.min(controlPoints.next.y, chartArea.bottom), chartArea.top);

			// Now pivot the point for animation
			point.pivot();
		});
	}

	draw(ease) {
		var meta = this.getMeta();
		var easingDecimal = ease || 1;

		// Transition Point Locations
		each(meta.data, function(point) {
			point.transition(easingDecimal);
		});

		// Transition and Draw the line
		meta.dataset.transition(easingDecimal).draw();

		// Draw the points
		each(meta.data, function(point) {
			point.draw();
		});
	}

	setHoverStyle(point) {
		// Point
		var dataset = this.chart.data.datasets[point._datasetIndex];
		var custom = point.custom || {};
		var index = point._index;
		var model = point._model;

		model.radius = custom.hoverRadius ? custom.hoverRadius : getValueAtIndexOrDefault(dataset.pointHoverRadius, index, this.chart.options.elements.point.hoverRadius);
		model.backgroundColor = custom.hoverBackgroundColor ? custom.hoverBackgroundColor : getValueAtIndexOrDefault(dataset.pointHoverBackgroundColor, index, getHoverColor(model.backgroundColor));
		model.borderColor = custom.hoverBorderColor ? custom.hoverBorderColor : getValueAtIndexOrDefault(dataset.pointHoverBorderColor, index, getHoverColor(model.borderColor));
		model.borderWidth = custom.hoverBorderWidth ? custom.hoverBorderWidth : getValueAtIndexOrDefault(dataset.pointHoverBorderWidth, index, model.borderWidth);
	}

	removeHoverStyle(point) {
		var dataset = this.chart.data.datasets[point._datasetIndex];
		var custom = point.custom || {};
		var index = point._index;
		var model = point._model;
		var pointElementOptions = this.chart.options.elements.point;

		model.radius = custom.radius ? custom.radius : getValueAtIndexOrDefault(dataset.radius, index, pointElementOptions.radius);
		model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : getValueAtIndexOrDefault(dataset.pointBackgroundColor, index, pointElementOptions.backgroundColor);
		model.borderColor = custom.borderColor ? custom.borderColor : getValueAtIndexOrDefault(dataset.pointBorderColor, index, pointElementOptions.borderColor);
		model.borderWidth = custom.borderWidth ? custom.borderWidth : getValueAtIndexOrDefault(dataset.pointBorderWidth, index, pointElementOptions.borderWidth);
	}
}
