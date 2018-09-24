'use strict';

let store = {};
let maxKey = 0;
let get;
let set;

/**
 * init
 * @param {function} dataGet define a getter function for a custom data storage solution
 * @param {function} dataSet define a setter function for a custom data storage solution
 */
let init = function init(dataGet, dataSet) {
	get = dataGet || defaultGet;
	set = dataSet || defaultSet;
}

/**
 * Create a new instance of transactor.
 * @param {Object} options 
 */
let create = function create(options) {
	if (get === undefined) {
		module.exports.init();
	}

	return new Transactor(options);
}

/**
 * Default data store get function, uses a local object if no getter is provided.
 * @param {String} key 
 */
function defaultGet() {
	return Object.assign({}, store);
}

/**
 * Default data store get function, uses a local object if no getter is provided.
 * @param {String} key 
 * @param {Any} value 
 */
function defaultSet(value) {
	return store = Object.assign({}, value);
}

/**
 * Transactor Class
 * Creates a series of transactions on the client.
 * @param {Object} options
 */
class Transactor {
	constructor(options) {
		let transactionData = get() || [];

		this.key = getNextKey(transactionData);
		this._revertedTransactions = [];
		this.options = options;
		transactionData[this.key] = [];
		set(transactionData);
	}

	/**
	 * Add a transaction.
	 * @param {String} id 
	 * @param {Object} data 
	 * @param {Object} options 
	 */
	add(id, data, options = {}) {
		if (!(options.add || options.update || options.delete)) {
			options.update = true;
		}
		if (options.save !== false) {
			options.save = true;
		}
		this._add(id, data, options);
		this._revertedTransactions = [];
	}

	/**
	 * can be called async, but will ensure adds are processed in the order they are created.
	 * @param {Number} id 
	 * @param {*} data 
	 * @param {Object} options 
	 */
	asyncAdd(id, data, options = { save: true, add: false, update: true, delete: false }) {
		return syncAsyncWork(() => {
			this._add(id, data, options);
			this._revertedTransactions = [];
			return Promise.resolve();
		})
	}

	/**
	 * Undo up to and including the last save transaction
	 */
	back() {
		let transactions = this._get();
		let isLookingForLastSavedIndex = true;
		let hasSaveableTransaction = transactions.some(t => t.options.save);
		let theseReversions = [];

		while (hasSaveableTransaction && isLookingForLastSavedIndex) {
			let popped = transactions.pop();

			if (popped.options.save) {
				isLookingForLastSavedIndex = false;
			}

			theseReversions.unshift(popped);
		}
		this._revertedTransactions = this._revertedTransactions.concat(theseReversions);
		this._set(transactions);
	}

	/**
	 * Redo up to and including the last undone save transaction
	 */
	forward() {	
		let transactions = this._get();
		let isLookingForLastSavedIndex = true;
		let hasSaveableTransaction = this._revertedTransactions.some(t => t.options.save);
		let theseReversions = [];

		while (hasSaveableTransaction && isLookingForLastSavedIndex) {
			let popped = this._revertedTransactions.pop();

			if (popped.options.save) {
				isLookingForLastSavedIndex = false;
			}

			theseReversions.unshift(popped);
		}
		
		transactions = transactions.concat(theseReversions);
		this._set(transactions);
	}

	/**
	 * clear all transactions
	 */
	clear() {
		this._set();
		this._revertedTransactions = [];
	}

	/**
	 * destroy the store data for this transactor instance
	 */
	destroy() {
		let transactionData = get();

		delete transactionData[this.key];
		set(transactionData);
	}

	/**
	 * get all transactions for this instance
	 */
	get() {
		return this._get().map(t => { return { id: t.id, data: t.data, options: t.options }});
	}

	getLatestEdge() {
		return this._getLatest().map(t => { return { id: t.id, data: t.data, options: t.options }});
	}

	superimpose(data) {
		let transactions = this._getLatest();
    let clientData =  data.slice();
    
    transactions.forEach(transaction => {
			let index = clientData.findIndex(clientData => clientData.id === transaction.id);
			let clientTransaction = {id: transaction.id, data: transaction.data}

      if (index === -1 && !transaction.options.delete) {
        clientData.push(clientTransaction);
      } else {
				if (transaction.options.delete) {
					clientData.splice([index], 1);
				} else {
					clientData[index] = clientTransaction;
				}
			}
		});
		
		return clientData;
	}

	// /**
	//  * Convience function - calls work function for each transaction.
	//  * @param {Function} work Function called for each transaction.  expects work to return a promise.
	//  * @returns Promise
	//  */
	// saveEach(put, post, del) {
	// 	let transactions = this._get();
	// 	let promises = [];

	// 	transactions.forEach(transaction => {
	// 		if (transaction.options.save) {
	// 			if (transaction.options.add) {
	// 				_throwIfNoWorker('add', post);
	// 				promises.push(syncAsyncWork(post, transaction.data));
	// 			} else if (transaction.options.delete) {
	// 				_throwIfNoWorker('delete', del);
	// 				promises.push(syncAsyncWork(del, transaction.data));
	// 			} else {
	// 				_throwIfNoWorker('update', put);
	// 				promises.push(syncAsyncWork(put, transaction.data));
	// 			}
	// 		}
	// 	});
	
	// 	return Promise.all(promises);
	// }

	/**
	 * calls work function one time with array of transactions
	 * @param {Function} work Function called for each transaction.  expects work to return a promise.
	 * @returns Promise
	 */
	save(put, post, del) {
		let transactions = this._get();
		let sorted = this._sortTransactionsByType(transactions);

		return this._save(sorted, put, post, del);
	}

	/**
	 * calls work function with array of transactions - if multiple transactions exist for a single ID it choses the latest one
	 * @param {Function} work 
	 */
	saveLatestEdge(put, post, del) {
		let transactions = this._getLatest();
		let sorted = this._sortTransactionsByType(transactions);

		return this._save(sorted, put, post, del);
	}

	/**
	 * Internal add transaction to instance store
	 * @param {String} id 
	 * @param {Object} data 
	 * @param {Object} options 
	 */
	_add(id, data, options) {
		let transactionData = this._get();
		let _id = this._getUniqueId(id);
		let thisTransaction = {
			id,
			data,
			options,
			_id,
		};
		let thisTransactionIndex = transactionData.findIndex(t => t._id === _id);

		if (thisTransactionIndex === -1) {
			transactionData.push(thisTransaction);
		} else {
			// This creates new transactions for each change.  If we are not saving this transaction, we do not need to worry about creating a unique one, we should update the old.
			transactionData.push(thisTransaction);
		}

		this._set(transactionData);
	}

	/**
	 * Intenral get transactions for this instance
	 */
	_get() {
		return get()[this.key];
	}

	/**
	 * Internal get transactions choising the last for each unique id
	 */
	_getLatest() {
		let transactions = this._get().slice();
		let dataToSave = [];

		transactions.forEach(transaction => {
			let index = dataToSave.findIndex(d => d.id === transaction.id);

			if (index === -1) {
				dataToSave.push(transaction);
			} else {
				let existingData = dataToSave[index];

				if (existingData.options.add) {
					if (transaction.options.delete) {
						dataToSave.splice(index, 1);
					} else {
						transaction.options = {save: transaction.options.save, add: true}
						dataToSave[index] = transaction
					}
				} else {
					dataToSave[index] = transaction;
				}
			}
		});

		return dataToSave;
	}

	/**
	 * get the next unique id
	 * @param {number} id 
	 */
	_getUniqueId(id) {
		let existingIds = this._get().map(t => t._id);
		
		if (existingIds.length === 0) {
			return id;
		} else {
			return Math.max(...existingIds) + 1;
		}
	}

	_isDeleteTransaction(transaction) {
		return transaction.data === undefined;
	}

	/**
	 * Call work function with array of transactions
	 * @param {Array} transactions 
	 * @param {Function} work 
	 */
	_save(dataToSave, put, post, del) {
		let workPromises = [];

		// only call work when we have transactions
		if (dataToSave.add.length > 0) {
			workPromises.push(post(dataToSave.add));
		}
		if (dataToSave.delete.length > 0) {
			workPromises.push(del(dataToSave.delete));
		}
		if (dataToSave.update.length > 0) {
			workPromises.push(put(dataToSave.update));
		}

		if (workPromises.length === 0) {
			return Promise.resolve();
		}

		return Promise.all(workPromises);
	}

	_sortTransactionsByType(transactions) {
		let dataToSave = {add: [], update: [], delete: []};

		transactions.forEach(transaction => {
			if (transaction.options.save) {
				if (transaction.options.add) {
					dataToSave.add.push(transaction.data);
				} else if (transaction.options.delete) {
					dataToSave.delete.push(transaction.data);
				} else {
					dataToSave.update.push(transaction.data);
				}
			}
		});

		return dataToSave;
	}

	/**
	 * Intenral set transactions for this instance
	 */
	_set(data = []) {
		let transactions = get();

		transactions[this.key] = data;
		set(transactions);
	}

	
}

let working = Promise.resolve();

function syncAsyncWork(worker, payload) {
	let nextWorking = new Promise((resolve, reject) => {
		working.then(() => {
			worker(payload).then(() => {
				resolve();
			})
			
		})
	});
	working = nextWorking;

	return nextWorking;
}

/**
 * gets the next transaction key for this instance.
 * @param {Object} transactionData 
 */
function getNextKey(transactionData) {
	let keys = Object.keys(transactionData);
	
	return keys.length > 0 ? Math.max(...keys) + 1 : 0;
}

function _throwIfNoWorker(type, functionToEnsure) {
	if (typeof functionToEnsure !== 'function') {
		throw new Error(`transaction was created with option: ${type}, but not valid function was given to handle this type.`);
	}
}

module.exports = {
	init,
	create,
	Transactor,
}