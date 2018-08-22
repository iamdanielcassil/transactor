'use strict';

let store = {};
let maxKey = 0;
let working = Promise.resolve();
let get;
let set;

let init = function init(dataGet, dataSet) {
	if (dataGet) {
		if (dataGet.then) {
			get = dataGet;
		} else {
			get = (key) => {
				return Promise.resolve(dataGet(key));
			}
		}
	} else {
		get = defaultGet;
	}

	if (dataSet) {
		if (dataSet.then) {
			set = dataSet;
		} else {
			set = (key) => {
				return Promise.resolve(dataSet(key, value));
			}
		}
	} else {
		set = defaultSet;
	}
}

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
function defaultGet(key) {
	return Promise.resolve(Object.assign({}, store[key] || []));
}

/**
 * Default data store get function, uses a local object if no getter is provided.
 * @param {String} key 
 * @param {Any} value 
 */
function defaultSet(key, value) {
	return Promise.resolve(store[key] = Object.assign({}, value));
}

/**
 * Transactor Class
 * Creates a series of transactions on the client.
 * @param {Object} options
 */
class Transactor {
	constructor(options = { saveAsSequence: false, forceUniqueIds: false }) {
		return get('transactions').then(transactionData => {
			this.key = getNextKey(transactionData);
			this._revertedTransactions = [];
			this.options = options;
			transactionData[this.key] = [];
			return set('transactions', transactionData);
		});
	}

	/**
	 * Add a transaction.
	 * @param {String} id 
	 * @param {Object} data 
	 * @param {Object} options 
	 */
	add(id, data, options = { save: true }) {
		return this.asyncWork(() => {
			this._add(id, data, options);
			this._revertedTransactions = [];
		});
	}

	/**
	 * Undo up to and including the last save transaction
	 */
	back() {
		let transactions = this._get(); //.sort((a, b) => a._tstamp - b._tstamp);
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
		asyncWork(() => {
			this._set();
			this._revertedTransactions = [];
		})
	}

	/**
	 * destroy the store data for this transactor instance
	 */
	destroy() {
		let transactionData = get('transactions');

		delete transactionData[this.key];
		set('transactions', transactionData);
	}

	/**
	 * get all transactions for this instance
	 */
	get() {
		return asyncWork(this._get().map(t => t.data));
	}

	/**
	 * Intenral get transactions for this instance
	 */
	_get() {
		return asyncWork(get('transactions')[this.key] || []);
	}

	/**
	 * Intenral set transactions for this instance
	 */
	_set(data = []) {
		let transactions = get('transactions');

		transactions[this.key] = data;
		set('transactions', transactions);
	}

	/**
	 * Internal add transaction to instance store
	 * @param {String} id 
	 * @param {Object} data 
	 * @param {Object} options 
	 */
	_add(id, data, options) {
		let transactionData = this._get();
		let thisTransactionIndex = transactionData.findIndex(t => t.id === id);
		let thisTransaction = {
			id: this.options.forceUniqueIds ? this._getUniqueId(id) : id,
			data,
			options,
			_tstamp: new Date().getTime(),
		};

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
			return id + existingIdIndex;
		}
	}
}

Transactor.prototype.async = {
	/**
	 * call work function for each transaction.
	 * @param {Function} work Function called for each transaction.  expects work to return a promise.
	 * @returns Promise
	 */
	saveEach: (work) => {
		let transactions = this._get();
		let promises = [];
	
		transactions.forEach(transaction => {
			if (transaction.options.save) {
				promises.push(work(transaction.data));
			}
		});
	
		return Promise.all(promises);
	},

	/**
	 * calls work function one time with array of transactions
	 * @param {Function} work Function called for each transaction.  expects work to return a promise.
	 * @returns Promise
	 */
	save: (work) => {
		let transactions = this._get();
		let dataToSave = transactions.filter(transaction => {
			return transaction.options.save;
		}).map(transaction => {
			return transaction.data;
		});

		// only call work when we have transactions
		if (dataToSave.length > 0) {
			return work(dataToSave);
		}

		return Promise.resolve();
	}
}

function asyncWork(worker) {
	let nextWorking = new Promise(resolve, reject, () => {
		working.then(() => {
			resolve(worker());
		})
	});
	working = nextWorkin;

	return nextWorkin;
}

/**
 * gets the next transaction key for this instance.
 * @param {Object} transactionData 
 */
function getNextKey(transactionData) {
	let keys = Object.keys(transactionData).map(k => k.replace('id-', '') * 1);

	keys.push(maxKey);

	maxKey = keys.length > 0 ? Math.max(...keys) + 1 : 0;

	return `id-${maxKey}`;
}

module.exports = {
	init,
	create,
	Transactor,
}