import {
	extend,
	configMerge,
	getValueOrDefault,
	fontString,
} from './core.helpers';
import Chart from './core';
import Element from './core.element';
import layoutService from './core.layoutService';

Chart.defaults.global.title = {
	display: false,
	position: 'top',
	fullWidth: true, // marks that this box should take the full width of the canvas (pushing down other boxes)

	fontStyle: 'bold',
	padding: 10,

	// actual title
	text: ''
};

export default class Title extends Element {

	constructor(config) {
		super();
		var me = this;
		extend(me, config);
		me.options = configMerge(Chart.defaults.global.title, config.options);

		// Contains hit boxes for each dataset (in dataset order)
		me.legendHitBoxes = [];
	}

	// These methods are ordered by lifecycle. Utilities then follow.

	beforeUpdate() {
		var chartOpts = this.chart.options;
		if (chartOpts && chartOpts.title) {
			this.options = configMerge(Chart.defaults.global.title, chartOpts.title);
		}
	}
	update(maxWidth, maxHeight, margins) {
		var me = this;

		// Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
		me.beforeUpdate();

		// Absorb the master measurements
		me.maxWidth = maxWidth;
		me.maxHeight = maxHeight;
		me.margins = margins;

		// Dimensions
		me.beforeSetDimensions();
		me.setDimensions();
		me.afterSetDimensions();
		// Labels
		me.beforeBuildLabels();
		me.buildLabels();
		me.afterBuildLabels();

		// Fit
		me.beforeFit();
		me.fit();
		me.afterFit();
		//
		me.afterUpdate();

		return me.minSize;

	}
	afterUpdate() {}

	//

	beforeSetDimensions() {}
	setDimensions() {
		var me = this;
		// Set the unconstrained dimension before label rotation
		if (me.isHorizontal()) {
			// Reset position before calculating rotation
			me.width = me.maxWidth;
			me.left = 0;
			me.right = me.width;
		} else {
			me.height = me.maxHeight;

			// Reset position before calculating rotation
			me.top = 0;
			me.bottom = me.height;
		}

		// Reset padding
		me.paddingLeft = 0;
		me.paddingTop = 0;
		me.paddingRight = 0;
		me.paddingBottom = 0;

		// Reset minSize
		me.minSize = {
			width: 0,
			height: 0
		};
	}
	afterSetDimensions() {}

	//

	beforeBuildLabels() {}
	buildLabels() {}
	afterBuildLabels() {}

	//

	beforeFit() {}
	fit() {
		var me = this,
			opts = me.options,
			globalDefaults = Chart.defaults.global,
			display = opts.display,
			fontSize = getValueOrDefault(opts.fontSize, globalDefaults.defaultFontSize),
			minSize = me.minSize;

		if (me.isHorizontal()) {
			minSize.width = me.maxWidth; // fill all the width
			minSize.height = display ? fontSize + (opts.padding * 2) : 0;
		} else {
			minSize.width = display ? fontSize + (opts.padding * 2) : 0;
			minSize.height = me.maxHeight; // fill all the height
		}

		me.width = minSize.width;
		me.height = minSize.height;

	}
	afterFit() {}

	// Shared Methods
	isHorizontal() {
		var pos = this.options.position;
		return pos === 'top' || pos === 'bottom';
	}

	// Actually draw the title block on the canvas
	draw() {
		var me = this,
			ctx = me.ctx,
			valueOrDefault = getValueOrDefault,
			opts = me.options,
			globalDefaults = Chart.defaults.global;

		if (opts.display) {
			var fontSize = valueOrDefault(opts.fontSize, globalDefaults.defaultFontSize),
				fontStyle = valueOrDefault(opts.fontStyle, globalDefaults.defaultFontStyle),
				fontFamily = valueOrDefault(opts.fontFamily, globalDefaults.defaultFontFamily),
				titleFont = fontString(fontSize, fontStyle, fontFamily),
				rotation = 0,
				titleX,
				titleY,
				top = me.top,
				left = me.left,
				bottom = me.bottom,
				right = me.right,
				maxWidth;

			ctx.fillStyle = valueOrDefault(opts.fontColor, globalDefaults.defaultFontColor); // render in correct colour
			ctx.font = titleFont;

			// Horizontal
			if (me.isHorizontal()) {
				titleX = left + ((right - left) / 2); // midpoint of the width
				titleY = top + ((bottom - top) / 2); // midpoint of the height
				maxWidth = right - left;
			} else {
				titleX = opts.position === 'left' ? left + (fontSize / 2) : right - (fontSize / 2);
				titleY = top + ((bottom - top) / 2);
				maxWidth = bottom - top;
				rotation = Math.PI * (opts.position === 'left' ? -0.5 : 0.5);
			}

			ctx.save();
			ctx.translate(titleX, titleY);
			ctx.rotate(rotation);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(opts.text, 0, 0, maxWidth);
			ctx.restore();
		}
	}
}

// Register the title plugin
Chart.plugins.register({
	beforeInit(chartInstance) {
		var opts = chartInstance.options;
		var titleOpts = opts.title;

		if (titleOpts) {
			chartInstance.titleBlock = new Title({
				ctx: chartInstance.chart.ctx,
				options: titleOpts,
				chart: chartInstance
			});

			layoutService.addBox(chartInstance, chartInstance.titleBlock);
		}
	}
});
