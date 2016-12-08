/**
 * @namespace Chart
 */
import Chartjs from './core/core';
import Controller from './core/core.controller';
import Element from './core/core.element';
import Interaction from './core/core.interaction';
import Legend from './core/core.legend';
import Tooltip from './core/core.tooltip';
import Title from './core/core.title';
import {plugins} from './core/core.plugin';
import scaleService from './core/core.scaleService';
import * as helpers from './core/core.helpers';
import defaults from './core/core.defaults';
import * as elements from './elements/index';
Chartjs.Controller = Controller;
Chartjs.Interaction = Interaction;
Chartjs.Legend = Legend;
Chartjs.Tooltip = Tooltip;
Chartjs.Title = Title;
Chartjs.Element = Element;
Chartjs.scaleService = scaleService;
Chartjs.helpers = helpers;
Chartjs.elements = elements;
Chartjs.defaults = defaults;
Chartjs.plugins = plugins;

// export {Chart};

// exports = Chart;
// debugger;
window.Chart = Chartjs;
export default Chartjs;
// module.exports = window.Chart = Chart;
// export const Chartjs = Chart;
// return Chart;
