'use strict';
import Controller from './core.controller';

export default class Chart {
	static instances = {}
	constructor(item, config) {
		this.controller = new Controller(item, config, this);
	}
}
