module.exports = function(config) {
	var configuration = {
		browsers: ['Firefox'],
		customLaunchers: {
			Chrome_travis_ci: {
				base: 'Chrome',
				flags: ['--no-sandbox']
			}
		},
		frameworks: ['browserify', 'jasmine'],
		reporters: ['progress', 'html'],
		preprocessors: {
			'src/**/*.js': ['browserify'],
			'test/**/*.js': ['browserify']
		},
		browserify: {
			debug: true,
			transform: [
				['babelify', {presets: ['es2015'], plugins: ['transform-class-properties']}]
			]
		}
	};

	if (process.env.TRAVIS) {
		configuration.browsers.push('Chrome_travis_ci');
	}

	config.set(configuration);
};