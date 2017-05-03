const assert = require('assert'),
camelCaseHeaders = require('../camelCaseHeaders'),
Freon = require('../index');

const notFoundPage = '404 - The webpage wasn\'t found ;(',
notFoundPageHeaders = { 'someNotFoundPageHeader' : 'some not found page key' },
testApp = new Freon.Application(undefined, notFoundPage, notFoundPageHeaders, true);

const createResponse = (on404, options) => {
	options = options || { };
	on404 = on404 || function() { };
	return Object.assign({
		'writeHead'	: on404,
		'end'		: on404
	}, options);
};

const createRequest = request => {
	return Object.assign({
		'connection' : {
			'remoteAddress' : '127.0.0.1'
		},
		'on' : () => { },
		'url' : 'http://localhost',
		'headers' : { }
	}, request);
};

module.exports = {
	'constructor()' : {
		'should set properties correctly' : () => {
			assert.strictEqual(testApp.notFoundPage, notFoundPage);
			assert.deepStrictEqual(testApp.notFoundPageHeaders, camelCaseHeaders.camelObjectToHeader(notFoundPageHeaders));
		}
	}, 'on()' : {
		'should set the "handlers" property correctly' : () => {
			const options = {
				'method' : 'GET',
				'pathname' : '/somePath'
			};
			testApp.on(options);
			assert.deepEqual(testApp.handlers[0].options, options);
		}, 'should accept RegExps': () => {
			const options = {
				'method' : 'POST',
				'pathname' : /.+/
			};
			testApp.on(options);
			assert.deepEqual(testApp.handlers[1].options, options);
		}, 'should run shorthand methods (ex. onPut) correctly' : () => {
			testApp.onPut('/putPath');
			assert.deepEqual(testApp.handlers[2].options, {
				'method' : 'PUT',
				'pathname' : '/putPath'
			});
		}, 'should get called on a reqest to it' : () => {
			return new Promise((resolve, reject) => {
				const on404 = () => {
					reject(new Error('404 should not be written.'));
				};
				testApp.onDelete('/testPath', () => {
					resolve();
				});
				testApp.testRequest(createRequest({
					'url' : 'http://127.0.0.1/testPath',
					'method' : 'DELETE'
				}), createResponse(on404));
			});
		}
	}, 'onAny()': {
		'should run on any request to the path' : () => {
			return new Promise((resolve, reject) => {
				const on404 = () => {
					reject(new Error('404 should not be written.'));
				};
				testApp.onAny('/shouldWorkWithAnyRequestMethod', () => {
					resolve();
				});
				testApp.testRequest(createRequest({
					'url' : 'http://127.0.0.1/shouldWorkWithAnyRequestMethod',
					'method' : 'PUT'
				}), createResponse(on404));
			});
		}
	}, 'plugin()' : {
		'should add to the plugins array' : () => {
			testApp.plugins = [ ];
			assert.strictEqual(testApp.plugins.length, 0);
			testApp.plugin((req, res, next) => { next(); });
			assert.strictEqual(testApp.plugins.length, 1);
		}, 'should be run on a request' : () => {
			return new Promise((resolve, reject) => {
				var success = false;
				testApp.plugin((req, res, next) => {
					req.foo = 'bar';
					res.key = 'value';
					next();
				});
				testApp.onGet('/pluginTestPath', (req, res) => {
					assert.strictEqual(req.foo, 'bar');
					assert.strictEqual(res.key, 'value');
					success = true;
					resolve();
				});
				testApp.testRequest(createRequest({
					'url' : 'http://127.0.0.1/pluginTestPath',
					'method' : 'GET'
				}), createResponse(() => {
					if (!success) {
						reject();
					}
				}));
			});
		}
	}
};