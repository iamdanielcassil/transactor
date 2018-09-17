'use strict';

let transactor = require('../src/transactor');
let mockItem = { id: 1, value: 'test' };
let store = {};
let get = () => store;
let set = (value) => store = value;

beforeEach(() => {
	store = {};
});

test('create should call init if it was not already called', () => {
	let spy = jest.spyOn(transactor, 'init');
	let instance = transactor.create();

	instance.add(1, mockItem);

	expect(spy).toBeCalled();
});

test('init should use default getter and setter', () => {
	transactor.init();
	let instance = transactor.create();

	instance.add(1, mockItem);

	expect(instance.key).toBe(1);
});

test('init should call getStub getter', () => {
	let called;
	let getStub = jest.fn().mockImplementation(get);

	transactor.init(getStub, set);
	let instance = transactor.create();

	expect(getStub).toBeCalled();
	getStub.mockRestore();
});

test('init should call setTub', () => {
	let setStublastValue;
	let setStub = jest.fn().mockImplementation(set);

	transactor.init(get, setStub);
	let instance = transactor.create();

	expect(setStub).toBeCalled();
	setStub.mockRestore();
})

test('create should create a new instance of Transactor', () => {
	let instance = transactor.create();

	expect(instance instanceof transactor.Transactor).toBeTruthy();
});

describe('create', () => {
	test('should set instance this.options to options', () => {
		let options = {test: true};
		let instance = transactor.create(options);
	
		expect(instance.options).toEqual(options);
	});
	
	test('should set key to a unique key', () => {
		let instance1 = transactor.create();
		let instance2 = transactor.create();
	
		expect(instance1.key).not.toEqual(instance2.key);
	});
})

describe('Instance Methods', () => {
	let transactionInstance;

	beforeEach(() => {
		store = {};
		transactionInstance = transactor.create();
	});

	test('sanity test beforeEach', () => {
		expect(transactionInstance.key).toEqual(0);
	});
	
	describe('add', () => {
		test('should add a new transaction to this transactor instance', () => {
			transactionInstance.add(1, mockItem);

			expect(store['0'].length).toEqual(1);
			expect(store['0'][0].data).toEqual(mockItem);
		});

		test('should update existing transaction with the same key', () => {
			transactionInstance.add(1, mockItem);
			transactionInstance.add(1, { isUpdated: true });

			expect(store['0'].length).toBe(1);
			expect(store['0'][0].data.isUpdated).toBeTruthy();
		});

		test('should add a new transaction with existing key if this.saveAsSequence is true', () => {
			transactionInstance = transactor.create({ saveAsSequence: true });
			transactionInstance.add(1, mockItem);
			transactionInstance.add(1, { isNew: true });

			expect(store['1'].length).toBe(2);
			expect(store['1'][1].data.isNew).toBeTruthy();
		});

		test('should add a new transaction with the new key', () => {
			transactionInstance.add(1, mockItem);
			transactionInstance.add(2, { isNew: true });

			expect(store['0'].length).toEqual(2);
			expect(store['0'][1].data.isNew).toBeTruthy();
		});

		test('should default to save = true', () => {
			transactionInstance.add(1, mockItem);

			expect(store['0'][0].options.save).toBeTruthy();
		});

		test('should override default options', () => {
			let options = { test: 'test' };

			transactionInstance.add(1, mockItem, options);
			expect(store['0'][0].options).toEqual(options);
		});
	});

		describe('back', () => {
			beforeEach(() => {
				
			});
			test('should revert to previous save transaction', () => {
				let transactionInstance2 = transactor.create({forceUniqueIds: true});
				transactionInstance2.add(1, mockItem);
				transactionInstance2.add(1, {id: 1, value: 'test change'});

				expect(transactionInstance2.get()[0].value).toBe('test');
				expect(transactionInstance2.get()[1].value).toBe('test change');
				transactionInstance2.back();
				expect(transactionInstance2.get()[0].value).toBe('test');
				expect(transactionInstance2.get()[1]).toBe(undefined);
			});
		});

		describe('forward', () => {
			test('should revert to previous save transaction', () => {
				let transactionInstance2 = transactor.create({forceUniqueIds: true});
				transactionInstance2.add(1, mockItem);
				transactionInstance2.add(1, {id: 1, value: 'test change'});

				expect(transactionInstance2.get()[0].value).toBe('test');
				expect(transactionInstance2.get()[1].value).toBe('test change');
				transactionInstance2.back();
				expect(transactionInstance2.get()[0].value).toBe('test');
				expect(transactionInstance2.get()[1]).toBe(undefined);
				transactionInstance2.forward();
				expect(transactionInstance2.get()[0].value).toBe('test');
				expect(transactionInstance2.get()[1].value).toBe('test change');
			});
		});

	describe('clear', () => {
		test('should clear all transactions for this instance', () => {
			transactionInstance.add(1, mockItem);
			expect(store['0'].length).toBe(1);
			transactionInstance.clear();
			expect(store['0'].length).toBe(0);
		});

		test('should not clear transactions for a different instance', () => {
			let instanceTwo = transactor.create({ saveAsSequence: true });

			instanceTwo.add(1, mockItem);
			transactionInstance.add(1, mockItem);
			expect(store['1'].length).toEqual(1);
			expect(store['0'].length).toEqual(1);
			instanceTwo.clear();
			expect(store['1'].length).toEqual(0);
			expect(store['0'].length).toEqual(1);
		});
	});

	describe('destroy', () => {
		test('should remove this instance key and data from the store', () => {
			expect(store['0']).not.toEqual(undefined);
			transactionInstance.destroy();
			expect(store['0']).toEqual(undefined);
		});
	});

	describe('get', () => {
		test('should get all transactions data', () => {
			transactionInstance.add(1, mockItem);
			transactionInstance.add(2, mockItem);

			let transactions = transactionInstance.get();

			expect(transactions[0]).toEqual(mockItem);
			expect(transactions[1]).toEqual(mockItem);
		});
	});

	describe('async', () => {
		let a = { work: undefined };
		let workTime = 1;
		let mockWork;

		beforeEach(() => {
			mockWork = jest.fn().mockReturnValue(Promise.resolve());
		});

		describe('add', () => {
			test('should add a new transaction to this transactor instance', (done) => {
				transactionInstance.asyncAdd(1, mockItem).then(() => {
					expect(store['0'].length).toEqual(1);
					expect(store['0'][0].data).toEqual(mockItem);
					done();
				});
			});

			test('should update existing transaction with the same key', (done) => {
				transactionInstance.asyncAdd(1, mockItem);
				transactionInstance.asyncAdd(1, { isUpdated: true }).then(() => {
					expect(store['0'].length).toBe(1);
					expect(store['0'][0].data.isUpdated).toBeTruthy();
					done();
				});
			});

			test('should add a new transaction with existing key if this.saveAsSequence is true', (done) => {
				transactionInstance = transactor.create({ saveAsSequence: true });
				transactionInstance.asyncAdd(1, mockItem);
				transactionInstance.asyncAdd(1, { isNew: true }).then(() => {
					expect(store['1'].length).toBe(2);
					expect(store['1'][1].data.isNew).toBeTruthy();
					done();
				});
			});

			test('should add a new transaction with the new key', (done) => {
				transactionInstance.asyncAdd(1, mockItem);
				transactionInstance.asyncAdd(2, { isNew: true }).then(() => {
					expect(store['0'].length).toEqual(2);
					expect(store['0'][1].data.isNew).toBeTruthy();
					done();
				});
			});

			test('should default to save = true', (done) => {
				transactionInstance.asyncAdd(1, mockItem).then(() => {
					expect(store['0'][0].options.save).toBeTruthy();
					done();
				});
			});
	
			test('should override default options', (done) => {
				let options = { test: 'test' };
	
				transactionInstance.asyncAdd(1, mockItem, options).then(() => {
					expect(store['0'][0].options).toEqual(options);
					done();
				});
			});
		});

		describe('saveEach', () => {
			let startTime;
			beforeEach(() => {
				startTime = new Date().getTime();
			});
			test('should call work for each transaction', (done) => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, mockItem);
				transactionInstance.saveEach(mockWork).then(() => {
					expect(mockWork.mock.calls.length).toBe(2);
					done();
				});
			});

			test('should call work syncronusly for each transaction', (done) => {
				workTime = 10;
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, mockItem);
				transactionInstance.add(3, mockItem);
				transactionInstance.saveEach(() => {
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							resolve()
						}, workTime)
				})}, true).then(() => {
					expect(new Date().getTime() - startTime).toBeGreaterThan(30);
					expect(new Date().getTime() - startTime).not.toBeGreaterThan(50);
					done();
				});
			});
		});
		

		describe('save', () => {
			test('should call work one time with array of transactions', (done) => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, mockItem);
				transactionInstance.save(mockWork).then(() => {
					expect(mockWork.mock.calls.length).toBe(1);
					done();
				});
			});
		});
	});
});