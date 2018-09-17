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
	constructor(options = { saveAsSequence: false, forceUniqueIds: false }) {
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
	add(id, data, options = { save: true }) {
		this._add(id, data, options);
		this._revertedTransactions = [];
	}

	asyncAdd(id, data, options = { save: true }) {
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
		return this._get().map(t => t.data);
	}

	/**
	 * call work function for each transaction.
	 * @param {Function} work Function called for each transaction.  expects work to return a promise.
	 * @returns Promise
	 */
	saveEach(work, sync = false) {
		let transactions = this._get();
		let promises = [];
	
		transactions.forEach(transaction => {
			if (transaction.options.save) {
				if (sync) {
					promises.push(syncAsyncWork(work, transaction.data))
				} else {
					promises.push(work(transaction.data));
				}
				
			}
		});
	
		return Promise.all(promises);
	}

	

	/**
	 * calls work function one time with array of transactions
	 * @param {Function} work Function called for each transaction.  expects work to return a promise.
	 * @returns Promise
	 */
	save(work) {
		let transactions = this._get();
		let dataToSave = transactions.filter(transaction => {
			return transaction.options.save;
		}).map(transaction => {
			return transaction.data;
		});

		// only call work when we have transactions
		if (dataToSave.length > 0) {
			return Promise.resolve(work(dataToSave));
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Intenral get transactions for this instance
	 */
	_get() {
		return get()[this.key] || [];
	}

	/**
	 * Intenral set transactions for this instance
	 */
	_set(data = []) {
		let transactions = get();

		transactions[this.key] = data;
		set(transactions);
	}

	/**
	 * Internal add transaction to instance store
	 * @param {String} id 
	 * @param {Object} data 
	 * @param {Object} options 
	 */
	_add(id, data, options) {
		let transactionData = this._get();
		let thisId = this.options.forceUniqueIds ? this._getUniqueId(id) : id;
		let thisTransaction = {
			id: thisId,
			data,
			options,
		};
		let thisTransactionIndex = transactionData.findIndex(t => t.id === thisId);
		

		if (thisTransactionIndex === -1) {
			transactionData.push(thisTransaction);
		} else if (this.options.saveAsSequence) {
			// This creates new transactions for each change.  If we are not saving this transaction, we do not need to worry about creating a unique one, we should update the old.
			transactionData.push(thisTransaction);
		} else {
			transactionData[thisTransactionIndex] = thisTransaction;
		}

		this._set(transactionData);
	}

	_getUniqueId(id) {
		let existingIdIndex = this._get().findIndex(t => t.id === id);
		
		if (existingIdIndex === -1) {
			return id;
		} else {
			return id + existingIdIndex + 1;
		}
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

module.exports = {
	init,
	create,
	Transactor,
}