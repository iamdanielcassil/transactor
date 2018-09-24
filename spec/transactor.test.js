'use strict';

let transactor = require('../src/transactor');
let mockItem = { id: 1, value: 'test' };
let store = {};
let get = () => store;
let set = (value) => store = value;
let transactionInstance;

test('create should call init if it was not already called', () => {
	let spy = jest.spyOn(transactor, 'init');

	transactionInstance = transactor.create();
	expect(spy).toBeCalled();
});

describe('init', () => {
	beforeEach(() => {
		store = {};
		transactionInstance = transactor.create();
	});
	
	test('should use default getter and setter', () => {
		transactor.init();
	
		transactionInstance.add(1, mockItem);
	
		expect(transactionInstance.key).toBe(1);
	});
	
	test('should use provided getter', () => {
		let called;
		let getStub = jest.fn().mockImplementation(get);
	
		transactor.init(getStub, set);
		transactor.create();
	
		expect(getStub).toBeCalled();
		getStub.mockRestore();
	});
	
	test('should not fail if getter returns undefined at create', () => {
		let getStub = jest.fn().mockImplementation(() => undefined);
	
		transactor.init(getStub, set);
		transactor.create();
	
		expect(getStub).toBeCalled();
		getStub.mockRestore();
	});
	
	test('should use provided setter', () => {
		let setStub = jest.fn().mockImplementation(set);
	
		transactor.init(get, setStub);
		transactor.create();
	
		expect(setStub).toBeCalled();
		setStub.mockRestore();
	})
	
	describe('create', () => {
		test('should create a new instance of Transactor', () => {
			transactionInstance = transactor.create();
		
			expect(transactionInstance instanceof transactor.Transactor).toBeTruthy();
		});

		test('should set instance options to options', () => {
			let options = {test: true};
			transactionInstance = transactor.create(options);
		
			expect(transactionInstance.options).toEqual(options);
		});
		
		test('should set key to a unique key for each instance', () => {
			let instance1 = transactor.create();
			let instance2 = transactor.create();
		
			expect(instance1.key).not.toEqual(instance2.key);
		});
	})
	
	describe('Instance Methods', () => {
		beforeEach(() => {
			store = {};
			transactionInstance = transactor.create();
		});
	
		test('sanity test beforeEach', () => {
			expect(transactionInstance.key).toEqual(0);
		});
		
		describe('add', () => {
			beforeEach(() => {
				store = {};
				transactionInstance = transactor.create();
			});
	
			test('should create unique id for each add', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(1, mockItem);
	
				expect(store['0'][0]._id).toBe(1);
				expect(store['0'][1]._id).toBe(2);
			})

			test('should leave provided id unchanged', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(1, { isNew: true });
	
				expect(store['0'][0].id).toBe(1);
				expect(store['0'][1].id).toBe(1);
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
				transactionInstance = transactor.create();
			});

			test('should not revert if no previous save transaction', () => {
				transactionInstance.add(1, mockItem, { save: false });
				transactionInstance.add(1, {id: 1, value: 'test change'}, { save: false });

				expect(transactionInstance.get()[0].data.value).toBe('test');
				expect(transactionInstance.get()[1].data.value).toBe('test change');
				transactionInstance.back();
				expect(transactionInstance.get()[0].data.value).toBe('test');
				expect(transactionInstance.get()[1].data.value).toBe('test change');
			});

			test('should revert to previous save transaction', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(1, {id: 1, value: 'test change'});

				expect(transactionInstance.get()[0].data.value).toBe('test');
				expect(transactionInstance.get()[1].data.value).toBe('test change');
				transactionInstance.back();
				expect(transactionInstance.get()[0].data.value).toBe('test');
				expect(transactionInstance.get()[1]).toBe(undefined);
			});
		});
	
		describe('forward', () => {
			beforeEach(() => {
				transactionInstance = transactor.create();
			});

			test('should revert last reversion', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(1, {id: 1, value: 'test change'});

				expect(transactionInstance.get()[0].data.value).toBe('test');
				expect(transactionInstance.get()[1].data.value).toBe('test change');
				transactionInstance.back();
				expect(transactionInstance.get()[0].data.value).toBe('test');
				expect(transactionInstance.get()[1]).toBe(undefined);
				transactionInstance.forward();
				expect(transactionInstance.get()[0].data.value).toBe('test');
				expect(transactionInstance.get()[1].data.value).toBe('test change');
			});

			test('should not revert if no previous reversion', () => {
				transactionInstance.add(1, mockItem, { save: false });
				transactionInstance.add(1, {id: 1, value: 'test change'});
				transactionInstance.add(1, {id: 1, value: 'test change 2'}, { save: false });

				let transactions = transactionInstance.get();

				expect(transactions[0].data.value).toBe('test');
				expect(transactions[1].data.value).toBe('test change');
				expect(transactions[2].data.value).toBe('test change 2');
				transactionInstance.back();
				transactions = transactionInstance.get();
				expect(transactions[0].data.value).toBe('test');
				transactionInstance.forward();
				transactions = transactionInstance.get();
				expect(transactions[0].data.value).toBe('test');
				expect(transactions[1].data.value).toBe('test change');
				expect(transactions[2].data.value).toBe('test change 2');
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
				let instanceTwo = transactor.create();
	
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
			test('should get all transactions', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, mockItem, {add: true});
				transactionInstance.add(3, mockItem, {delete: true});
				transactionInstance.add(4, mockItem, {save: false});
				transactionInstance.add(5, mockItem, {update: true});
	
				let transactions = transactionInstance.get();
	
				expect(transactions[0]).toEqual({id:1, data: mockItem, options: {save: true, update: true }});
				expect(transactions[1]).toEqual({id:2, data: mockItem, options: {save: true, add: true }});
				expect(transactions[2]).toEqual({id:3, data: mockItem, options: {save: true, delete: true }});
				expect(transactions[3]).toEqual({id:4, data: mockItem, options: {save: false, update: true }});
				expect(transactions[4]).toEqual({id:5, data: mockItem, options: {save: true, update: true }});
			});
		});

		describe('getLatestEdge', () => {
			test('should get latest edge transactions', () => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, mockItem, {add: true});
				transactionInstance.add(3, mockItem, {delete: true});
				transactionInstance.add(4, mockItem, {save: false});
				transactionInstance.add(5, mockItem, {update: true});
	
				let transactions = transactionInstance.getLatestEdge();
	
				expect(transactions[0]).toEqual({id:1, data: mockItem, options: {save: true, update: true }});
				expect(transactions[1]).toEqual({id:2, data: mockItem, options: {save: true, add: true }});
				expect(transactions[2]).toEqual({id:3, data: mockItem, options: {save: true, delete: true }});
				expect(transactions[3]).toEqual({id:4, data: mockItem, options: {save: false, update: true }});
				expect(transactions[4]).toEqual({id:5, data: mockItem, options: {save: true, update: true }});
			});

			test('should get latest edge transactions picking latest for duplicate ids', () => {
				let change = {id: 3, value: 'change'};

				transactionInstance.add(1, mockItem);
				transactionInstance.add(1, change);
	
				let transactions = transactionInstance.getLatestEdge();
	
				expect(transactions[0].data).toEqual(change);
				expect(transactions[1]).toEqual(undefined);
			});
		});
	
		describe('asyncAdd', () => {
			beforeEach(() => {
				store = {};
				transactionInstance = transactor.create();
			});
	
			test('should add a new transaction', (done) => {
				transactionInstance.asyncAdd(1, mockItem).then(() => {
					expect(store['0'].length).toEqual(1);
					expect(store['0'][0].data).toEqual(mockItem);
					done();
				});
			});

			test('should add a new transaction with existing key', (done) => {
				transactionInstance.asyncAdd(1, mockItem);
				transactionInstance.asyncAdd(1, { isNew: true }).then(() => {
					expect(store['0'].length).toBe(2);
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
			let mockWork;
			let workTime = 1;

			beforeEach(() => {
				startTime = new Date().getTime();
				mockWork = jest.fn().mockReturnValue(Promise.resolve());
			});

			test('should call work for each saveable transaction', (done) => {
				transactionInstance.add(1, mockItem);
				transactionInstance.add(2, mockItem);
				transactionInstance.saveEach(mockWork).then(() => {
					expect(mockWork.mock.calls.length).toBe(2);
					done();
				});
			});

			test('should ignore non saveable transaction', (done) => {
				transactionInstance.add(1, mockItem, { save: false });
				transactionInstance.add(2, mockItem);
				transactionInstance.saveEach(mockWork).then(() => {
					expect(mockWork.mock.calls.length).toBe(1);
					done();
				});
			});

			test('should call add function for options.add = true transaction', (done) => {
				transactionInstance.add(1, mockItem, {add: true});
				transactionInstance.saveEach(undefined, mockWork, undefined).then(() => {
					expect(mockWork.mock.calls.length).toBe(1);
					done();
				});
			});

			test('should call delete function for options.delete = true transaction', (done) => {
				transactionInstance.add(1, mockItem, {delete: true});
				transactionInstance.saveEach(undefined, undefined, mockWork).then(() => {
					expect(mockWork.mock.calls.length).toBe(1);
					done();
				});
			});

			test('should call add, update, delete functions once each', (done) => {
				let mockAdd = jest.fn().mockReturnValue(Promise.resolve());
				let mockUpdate = jest.fn().mockReturnValue(Promise.resolve());
				let mockDelete = jest.fn().mockReturnValue(Promise.resolve());

				transactionInstance.add(1, mockItem, {delete: true});
				transactionInstance.add(1, mockItem, {add: true});
				transactionInstance.add(1, mockItem, {update: true});
				transactionInstance.saveEach(mockUpdate, mockAdd, mockDelete).then(() => {
					expect(mockAdd.mock.calls.length).toBe(1);
					expect(mockUpdate.mock.calls.length).toBe(1);
					expect(mockDelete.mock.calls.length).toBe(1);
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
	
			describe('save', () => {
				let mockWork;

				beforeEach(() => {
					mockWork = jest.fn().mockReturnValue(Promise.resolve());
				});

				test('should call update one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem);
					transactionInstance.add(2, mockItem);
					transactionInstance.save(mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(1);
						done();
					});
				});

				test('should call add one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem, {add: true});
					transactionInstance.add(2, mockItem, {add: true});
					transactionInstance.save(undefined, mockWork, undefined).then(() => {
						expect(mockWork.mock.calls.length).toBe(1);
						done();
					});
				});

				test('should call delete one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem, {delete: true});
					transactionInstance.add(2, mockItem, {delete: true});
					transactionInstance.save(undefined, undefined, mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(1);
						done();
					});
				});

				test('should call update, add, and delete each one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem, {add: true});
					transactionInstance.add(2, mockItem, {update: true});
					transactionInstance.add(2, mockItem, {delete: true});
					transactionInstance.save(mockWork, mockWork, mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(3);
						done();
					});
				});
	
				test('should not call work with an empty array of transactions', (done) => {
					transactionInstance.save(mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(0);
						done();
					});
				});
			});

			describe('saveLatestEdge', () => {
				let mockWork;

				beforeEach(() => {
					mockWork = jest.fn().mockReturnValue(Promise.resolve());
				});

				test('should call work one time with array of transactions defaulting to put if add or delete was not set.', (done) => {
					transactionInstance.add(1, {value: 'test'});
					transactionInstance.add(1, {value: 'test 1'});
					transactionInstance.add(2, {value: 'test 2'});
					transactionInstance.saveLatestEdge(mockWork).then(() => {
						expect(mockWork).toBeCalledWith([{value: 'test 1'}, {value: 'test 2'}]);
						done();
					});
				});

				test('should call update one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem);
					transactionInstance.add(2, mockItem);
					transactionInstance.saveLatestEdge(mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(1);
						done();
					});
				});

				test('should call add one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem, {add: true});
					transactionInstance.add(2, mockItem, {add: true});
					transactionInstance.saveLatestEdge(undefined, mockWork, undefined).then(() => {
						expect(mockWork.mock.calls.length).toBe(1);
						done();
					});
				});

				test('should call delete one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem, {delete: true});
					transactionInstance.add(2, mockItem, {delete: true});
					transactionInstance.saveLatestEdge(undefined, undefined, mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(1);
						done();
					});
				});

				test('should call update, add, and delete each one time with array of transactions', (done) => {
					transactionInstance.add(1, mockItem, {add: true});
					transactionInstance.add(2, mockItem, {update: true});
					transactionInstance.add(3, mockItem, {delete: true});
					transactionInstance.saveLatestEdge(mockWork, mockWork, mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(3);
						done();
					});
				});

				test('should call work type for last transaction of a given id', (done) => {
					transactionInstance.add(1, mockItem, {add: true});
					transactionInstance.add(1, mockItem, {update: true});
					transactionInstance.add(1, mockItem, {delete: true});
					transactionInstance.saveLatestEdge(undefined, undefined, mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(1);
						done();
					});
				});
	
				test('should not call work with an empty array of transactions', (done) => {
					transactionInstance.saveLatestEdge(mockWork).then(() => {
						expect(mockWork.mock.calls.length).toBe(0);
						done();
					});
				});
			});

			describe('superimpose', () => {
				it('should add transactions on top of client data', () => {
					let clientData = [{id: 1, val: 'test'}];

					transactionInstance.add(1, {id: 1, val: 'test update'});

					let imposedData = transactionInstance.superimpose(clientData.map(cd => { return {id: cd.id, data: cd }}));

					expect(imposedData.length).toBe(1);
					expect(imposedData[0].data.val).toBe('test update');
				});

				it('should add last transactions on top of client data', () => {
					let clientData = [{id: 1, val: 'test'}];

					transactionInstance.add(1, {id: 1, val: 'test update'});
					transactionInstance.add(1, {id: 1, val: 'test update 2'});

					let imposedData = transactionInstance.superimpose(clientData.map(cd => { return {id: cd.id, data: cd }}));

					expect(imposedData.length).toBe(1);
					expect(imposedData[0].data.val).toBe('test update 2');
				});

				it('should remove item with delete transaction from returned data', () => {
					let clientData = [{id: 1, val: 'test'}, {id: 2, val: 'test2'}];

					transactionInstance.add(1, {id: 1, val: 'test update'}, {delete: true});

					let imposedData = transactionInstance.superimpose(clientData.map(cd => { return {id: cd.id, data: cd }}));

					expect(imposedData.length).toBe(1);
					expect(imposedData[0].data.val).toBe('test2');
				});

				it('should not affect client data without transactions', () => {
					let clientData = [{id: 2, val: 'test'}];

					transactionInstance.add(1, {id: 1, val: 'test update'});

					let imposedData = transactionInstance.superimpose(clientData.map(cd => { return {id: cd.id, data: cd }}));

					expect(imposedData.length).toBe(2);
				});
			})
		});
	});
});
