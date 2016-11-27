import {extend, each, clone, isNumber} from './core.helpers';

export default class Element {
	constructor(configuration) {
		extend(this, configuration);
		this.hidden = false;
	}

	pivot() {
		var me = this;
		if (!me._view) {
			me._view = clone(me._model);
		}
		me._start = clone(me._view);
		return me;
	}

	transition(ease) {
		var me = this;

		if (!me._view) {
			me._view = clone(me._model);
		}

		// No animation -> No Transition
		if (ease === 1) {
			me._view = me._model;
			me._start = null;
			return me;
		}

		if (!me._start) {
			me.pivot();
		}

		each(me._model, function(value, key) {

			if (key[0] === '_') {
				// Only non-underscored properties
			// Init if doesn't exist
			} else if (!me._view.hasOwnProperty(key)) {
				if (typeof value === 'number' && !isNaN(me._view[key])) {
					me._view[key] = value * ease;
				} else {
					me._view[key] = value;
				}
			// No unnecessary computations
			} else if (value === me._view[key]) {
				// It's the same! Woohoo!
			// Color transitions if possible
			} else if (typeof value === 'string') {
				try {
					var color = color(me._model[key]).mix(color(me._start[key]), ease);
					me._view[key] = color.rgbString();
				} catch (err) {
					me._view[key] = value;
				}
			// Number transitions
			} else if (typeof value === 'number') {
				var startVal = me._start[key] !== undefined && isNaN(me._start[key]) === false ? me._start[key] : 0;
				me._view[key] = ((me._model[key] - startVal) * ease) + startVal;
			// Everything else
			} else {
				me._view[key] = value;
			}
		}, me);

		return me;
	}

	tooltipPosition() {
		return {
			x: this._model.x,
			y: this._model.y
		};
	}

	hasValue() {
		return isNumber(this._model.x) && isNumber(this._model.y);
	}
}
