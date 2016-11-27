import Chart from '../core/core';

export default (context, config) => {
	config.type = 'line';
	return new Chart(context, config);
};
