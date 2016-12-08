import Chart from '../core/core';

export default (context, config) => {
	config.type = 'bubble';
	return new Chart(context, config);
};
