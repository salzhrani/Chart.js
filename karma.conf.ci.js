var babel = require('rollup-plugin-babel');
var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');

module.exports = function(config) {
	var configuration = {
		browsers: ['Firefox'],
		customLaunchers: {
			Chrome_travis_ci: {
				base: 'Chrome',
				flags: ['--no-sandbox']
			}
		},
		frameworks: ['jasmine'],
		reporters: ['progress', 'html'],
		preprocessors: {
			'src/**/*.js': ['rollup']
		},
		rollupPreprocessor: {
			entry: './src/chart.js',
			plugins: [
				nodeResolve({jsnext: true, main: true}),
				commonjs({
					include: 'node_modules/**',
				}),
				babel({
					// exclude: 'node_modules/**',
					presets: [["es2015", {"loose": true, "modules": false }]],
					plugins: ['transform-class-properties', 'external-helpers'],
				}),
			],
			exports: 'named',
			moduleName: 'Chartjs',
			format: 'umd'
		}
	};

	if (process.env.TRAVIS) {
		configuration.browsers.push('Chrome_travis_ci');
	}

	config.set(configuration);
};