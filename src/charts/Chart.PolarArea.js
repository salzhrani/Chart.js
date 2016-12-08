import Chart from '../core/core';

export default (context, config) => {
	config.type = 'polarArea';
	return new Chart(context, config);
};
