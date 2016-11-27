import Chart from '../core/core';

export default (context, config) => {
	config.type = 'radar';
	return new Chart(context, config);
};
