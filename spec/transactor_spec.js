'use strict';

let transactor = require('../src/transactor');

describe('transactor', () => {
	let mockItem = { id: 1, value: 'test' };
	let store = {};
	let get = () => store;
	let set = (value) => store = value;

	beforeEach(() => {
		transactor.init(get, set);
		store = {};
	});

	describe('init', () => {
		it('should call default getter', () => {
			let called;
			let getStub = function () { called = true; };

			transactor.init(getStub);
			let instance = transactor.create();

			expect(called).toBeTruthy();
		});

		it('should set a default setter', () => {
			let lastValue;
			let setStub = function (value) { lastValue = value; };

			transactor.init(undefined, setStub);
			let instance = transactor.create();

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

	describe('Instance Methods', () => {
		let transactionInstance;

		beforeEach(() => {
			store = {};
			transactionInstance = transactor.create();
		});

		it('sanity test beforeEach', () => {
			expect(transactionInstance.key).toEqual('id-0');
		});
		
		describe('add', () => {
			it('should add a new transaction to this transactor instance', () => {
				transactionInstance.add(1, mockItem);

				expect(store['id-0'].length).toEqual(1);
				expect(store['id-0'][0].data).toEqual(mockItem);
			});

			it('should update existing transaction with the same key', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(1, { isUpdated: true });

				expect(store['id-0'].length).toBe(1);
				expect(store['id-0'][0].data.isUpdated).toBeTruthy();
			});

			it('should add a new transaction with existing key if this.saveAsSequence is true', () => {
				transactionInstance = transactor.create({ saveAsSequence: true });
				transactionInstance.add(1, mockItem);
				transactionInstance.add(1, { isNew: true });

				expect(store['id-1'].length).toBe(2);
				expect(store['id-1'][1].data.isNew).toBeTruthy();
			});

			it('should add a new transaction with the new key', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, { isNew: true });

				expect(store['id-0'].length).toEqual(2);
				expect(store['id-0'][1].data.isNew).toBeTruthy();
			});

			it('should default to save = true', () => {
				transactionInstance.add(1, mockItem);

				expect(store['id-0'][0].options.save).toBeTruthy();
			});

			it('should override default options', () => {
				let options = { test: 'test' };

				transactionInstance.add(1, mockItem, options);
				expect(store['id-0'][0].options).toEqual(options);
			});
		});

		describe('clear', () => {
			it('should clear all transactions for this instance', () => {
				transactionInstance.add(1, mockItem);
				expect(store['id-0'].length).toBe(1);
				transactionInstance.clear();
				expect(store['id-0'].length).toBe(0);
			});

			it('should not clear transactions for a different instance', () => {
				let instanceTwo = transactor.create({ saveAsSequence: true });

				instanceTwo.add(1, mockItem);
				transactionInstance.add(1, mockItem);
				expect(store['id-1'].length).toEqual(1);
				expect(store['id-0'].length).toEqual(1);
				instanceTwo.clear();
				expect(store['id-1'].length).toEqual(0);
				expect(store['id-0'].length).toEqual(1);
			});
		});

		describe('destroy', () => {
			it('should remove this instance key and data from the store', () => {
				expect(store['id-0']).not.toEqual(undefined);
				transactionInstance.destroy();
				expect(store['id-0']).toEqual(undefined);
			});
		});

		describe('get', () => {
			it('should get all transactions data', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, mockItem);

				let transactions = transactionInstance.get();

				expect(transactions[0]).toEqual(mockItem);
				expect(transactions[1]).toEqual(mockItem);
			});
		});

		describe('async', () => {
			let a = { work: undefined };
			let work;

			beforeEach(() => {
				a.work = Promise.resolve();
				spyOn(a, 'work');
			});

			describe('saveEach', () => {
				it('should call work for each transaction', (done) => {
					transactionInstance.add(1, mockItem);
					transactionInstance.add(2, mockItem);
					transactionInstance.saveEach(a.work).then(() => {
						expect(a.work.calls.count()).toBe(2);
						done();
					});
				});
			});

			describe('save', () => {
				it('should call work one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem);
					transactionInstance.add(2, mockItem);
					transactionInstance.save(a.work).then(() => {
						expect(a.work.calls.count()).toBe(1);
						done();
					});
				});
			});
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