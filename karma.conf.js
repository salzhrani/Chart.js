module.exports = function(config) {
	config.set({
		browsers: ['Chrome'],
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
	});
};