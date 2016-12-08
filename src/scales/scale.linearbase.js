import {
	sign,
	getValueOrDefault,
	max,
	min,
} from '../core/core.helpers';
import Scale from '../core/core.scale';
import Ticks from '../core/core.ticks';

export default class LinearScaleBase extends Scale {
	handleTickRangeOptions() {
		var me = this;
		var opts = me.options;
		var tickOpts = opts.ticks;

		// If we are forcing it to begin at 0, but 0 will already be rendered on the chart,
		// do nothing since that would make the chart weird. If the user really wants a weird chart
		// axis, they can manually override it
		if (tickOpts.beginAtZero) {
			var minSign = sign(me.min);
			var maxSign = sign(me.max);

			if (minSign < 0 && maxSign < 0) {
				// move the top up to 0
				me.max = 0;
			} else if (minSign > 0 && maxSign > 0) {
				// move the bottom down to 0
				me.min = 0;
			}
		}

		if (tickOpts.min !== undefined) {
			me.min = tickOpts.min;
		} else if (tickOpts.suggestedMin !== undefined) {
			me.min = Math.min(me.min, tickOpts.suggestedMin);
		}

		if (tickOpts.max !== undefined) {
			me.max = tickOpts.max;
		} else if (tickOpts.suggestedMax !== undefined) {
			me.max = Math.max(me.max, tickOpts.suggestedMax);
		}

		if (me.min === me.max) {
			me.max++;

			if (!tickOpts.beginAtZero) {
				me.min--;
			}
		}
	}
	getTickLimit() {}
	handleDirectionalChanges() {}

	buildTicks() {
		var me = this;
		var opts = me.options;
		var tickOpts = opts.ticks;

		// Figure out what the max number of ticks we can support it is based on the size of
		// the axis area. For now, we say that the minimum tick spacing in pixels must be 50
		// We also limit the maximum number of ticks to 11 which gives a nice 10 squares on
		// the graph. Make sure we always have at least 2 ticks
		var maxTicks = me.getTickLimit();
		maxTicks = Math.max(2, maxTicks);

		var numericGeneratorOptions = {
			maxTicks: maxTicks,
			min: tickOpts.min,
			max: tickOpts.max,
			stepSize: getValueOrDefault(tickOpts.fixedStepSize, tickOpts.stepSize)
		};
		var ticks = me.ticks = Ticks.generators.linear(numericGeneratorOptions, me);

		me.handleDirectionalChanges();

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
		var me = this;
		me.ticksAsNumbers = me.ticks.slice();
		me.zeroLineIndex = me.ticks.indexOf(0);

		Scale.prototype.convertTicksToLabels.call(me);
	}
}
