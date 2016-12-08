import Chart from '../core/core';
import defaults from '../core/core.defaults';

var defaultConfig = {
	hover: {
		mode: 'single'
	},

	scales: {
		xAxes: [{
			type: 'linear', // scatter should not use a category axis
			position: 'bottom',
			id: 'x-axis-1' // need an ID so datasets can reference the scale
		}],
		yAxes: [{
			type: 'linear',
			position: 'left',
			id: 'y-axis-1'
		}]
	},

	tooltips: {
		callbacks: {
			title: function() {
				// Title doesn't make sense for scatter since we format the data as a point
				return '';
			},
			label: function(tooltipItem) {
				return '(' + tooltipItem.xLabel + ', ' + tooltipItem.yLabel + ')';
			}
		}
	}
};

// Register the default config for this type
defaults.scatter = defaultConfig;

export default (context, config) => {
	config.type = 'scatter';
	return new Chart(context, config);
};
