import Chart from '../core/core';

export default (context, config) => {
	config.type = 'bar';
	return new Chart(context, config);
};
