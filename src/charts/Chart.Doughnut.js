import Chart from '../core/core';

export default (context, config) => {
	config.type = 'doughnut';
	return new Chart(context, config);
};
