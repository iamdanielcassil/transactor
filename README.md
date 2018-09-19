# Transactor

Transactor is a simple library that helps to keep track of local transactional changes to data. 

### Overview!

Transactor creates and manages client side transactions, allowing you to then opperate on them individualy or as a whole.  For example, you could create a transaction for adding several new users to a form, then save them all at once.  Additionaly, Transactor gives access to the transactions and provides methods to super impose the transactions on an existing data set, it allows undo and redo features, and can differntiate between saveable and non saveable transactions.  Lastly each instantiation of Transactor keys its transactions uniquely, meaning you can have multiple transctor instance at once.


### You can 
- Save a sequence of changes to the same set of data
- Create saveable and unsaveable changes
	- Saveable changes will be given to the save handler, where is unsaveable will be ignored and only used locally.
- Undo changes
- Redo changes
- Create 1 or more instances to track 1 or more sets of changes