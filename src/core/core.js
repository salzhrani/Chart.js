'use strict';
import Controller from './core.controller';

export default class Chart {
	static defaults = {
		responsive: true,
		responsiveAnimationDuration: 0,
		maintainAspectRatio: true,
		events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
		hover: {
			onHover: null,
			mode: 'nearest',
			intersect: true,
			animationDuration: 400
		},
		onClick: null,
		defaultColor: 'rgba(0,0,0,0.1)',
		defaultFontColor: '#666',
		defaultFontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
		defaultFontSize: 12,
		defaultFontStyle: 'normal',
		showLines: true,

		// Element defaults defined in element extensions
		elements: {},

		// Legend callback string
		legendCallback: function(chart) {
			var text = [];
			text.push('<ul class="' + chart.id + '-legend">');
			for (var i = 0; i < chart.data.datasets.length; i++) {
				text.push('<li><span style="background-color:' + chart.data.datasets[i].backgroundColor + '"></span>');
				if (chart.data.datasets[i].label) {
					text.push(chart.data.datasets[i].label);
				}
				text.push('</li>');
			}
			text.push('</ul>');

			return text.join('');
		}
	}
	static instances = {}
	constructor(item, config) {
		this.controller = new Controller(item, config);
	}
}
