Transactor is a simple library that helps to keep track of local transactional changes to data.  
It was purpose built to manage making a series of changes to multiple pieces of data, while keeping an audit trail or each change, along with the ability to revert and un-revert changes.

Features include

	- Save a sequence of changes to the same set of data
	-	Create saveable and unsaveable changes
		-	Saveable changes will be given to the save handler, where is unsaveable will be ignored and only used locally.
	-	Undo changes
	-	Redo changes
	-	Create 1 or more instances to track 1 or more sets of changes
	-	Sync-Async creation of changes
		-	Sync-Async lets you add a change in a async way while ensuring each change is added in order.