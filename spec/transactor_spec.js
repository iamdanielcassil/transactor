'use strict';

let transactor;

describe('transactor', () => {
	beforeEach(() => {
		transactor = require('../src/transactor');
	});

	describe('init', () => {
		it('should set a default getter', () => {
			let lastKey;
			let getStub = function (key) { lastKey = key; };

			transactor.init(getStub);
			let instance = transactor.create();

			expect(lastKey).toBe('transactions');
		});

		it('should set a default setter', () => {
			let lastKey;
			let lastValue;
			let setStub = function (key, value) { lastKey = key; lastValue = value; };

			transactor.init(undefined, setStub);
			let instance = transactor.create();

			expect(lastKey).toBe('transactions');
			expect(lastValue).toEqual(jasmine.any(Object));
		})
	});

	describe('create', () => {
		it('should create a new instance of Transactor', () => {
			let instance = transactor.create();

			expect(instance instanceof transactor.Transactor).toBeTruthy();
		});
		it('should set instance this.options to options', () => {
			let options = {test: true};
			let instance = transactor.create(options);

			expect(instance.options).toEqual(options);
		});
		it('should set key to a unique key', () => {
			let instance1 = transactor.create();
			let instance2 = transactor.create();

			expect(instance1.key).not.toEqual(instance2.key);
		});
	});

	// describe('instance of Transactor', () => {
	// 	describe('add', () => {

	// 	});
	// 	describe('back', () => {

	// 	});
	// 	describe('forward', () => {

	// 	});
	// 	describe('clear', () => {

	// 	});
	// 	describe('destroy', () => {

	// 	});
	// 	describe('get', () => {

	// 	});
	// 	describe('async', () => {
	// 		describe('saveEach', (done) => {

	// 		});
	// 		describe('save', (done) => {

	// 		})
	// 	});
	// });
});