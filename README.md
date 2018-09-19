![alt text][logo]

[logo]: https://iamdanielcassil.github.io/icon.png
# Transactor

Transactor is a simple library that helps to keep track of local transactional changes to data.

### Start Here

#### install
```javascript
npm i --save sequence-transactor
```
#### include transactor in your project
```javascript
import sequenceTransactor from 'sequence-transactor'
```
#### use it
```javascript
let transactor = sequenceTransactor.create();
```
#### add transactions
```javascript
id = 1;

transactor.add(id, {id, value: 'test'});
transactor.add(id, {id, value: 'test change'});
transactor.add(id, {id, value: 'test change three'});
```
#### get transaction data
```javascript
let data = transactor.get();

// expected data
[
  {id, value: 'test'},
  {id, value: 'test change'},
  {id, value: 'test change three'},
]
```
#### get latest edge data
```javascript
let data = transaction.getLatest();

// expected data
[
  {id, value: 'test change three'},
]
```
getLatest uses the id param (first param given to add(id, data)) to group data.

for example
```javascript
transactor.add(1, {id: 1, value: 'test'});
transactor.add(1, {id: 2, value: 'test change'});
transactor.add(1, {id: 3, value: 'test change three'});
```
these are seen by transactor as a single piece of data with multiple transactions.

while this.
```javascript
transactor.add(1, {id: 1, value: 'test'});
transactor.add(2, {id: 1, value: 'test change'});
transactor.add(3, {id: 1, value: 'test change three'});
```
is seen as 3 pieces of data, each with one transaction.

#### back() and Forward()
 These let you navigate backwards and forwards in time through your transactions.
 - Only works with saveAsSequence (default option) on creare();

 ```javascript
 transactor.back();
 transactor.get();

 // returns
 [
  {id, value: 'test'},
  {id, value: 'test change'},
 ]

 transactor.back();
 transactor.get();
 
 // returns
 [
  {id, value: 'test'},
 ]

 transactor.forward();
 transactor.get();
 
 // returns
 [
  {id, value: 'test'},
  {id, value: 'test change'},
 ]

```
Transactor also has the concept of saveable transactions and non-saveable transactions.  
It is noted here because back() will go back up to and including the last saveable transaction.  The same is true of forward().  The reason for this will e discussed in detail further on.

#### save data -- all save functions expect work to return a promise, and return a promise.all that resolves when all work promsies resolve
```javascript
let saveFunction = (data) => {
  console.log(data);
  return Promise.resolve();
}

transactor.save(saveFunction)
```
this will call console.log one time with an array of data to save.
```javascript
[
  {id: 1, value: 'test'},
  {id: 1, value: 'test change'},
  {id: 1, value: 'test change two'},
]
```
#### save latest edge only
if you only want to make calls for the latest edge data you can use.
```javascript
transactor.saveEdge(saveFunction)

// this will call console.log one time with
[
  {id: 1, value: 'test change two'},
]
```

### saveEach - call work one time for each piece of data
```javascript
transactor.saveEach(saveFunction)
```
this will call console.log one time for each piece of data to save.
```javascript
  // call one
  {id: 1, value: 'test'},
  //call two
  {id: 1, value: 'test change'},
  // call three
  {id: 1, value: 'test change two'},
```
#### saveable vs non-saveable transactions
depnding on what type of data and why you are making transactions, you may need to create client side only transactions.  

This feature was purpose built for the case where a server manipulates data on save, and the client needs to mimic that behavior.  For example saving data A, causes an update to data B done by the server on save.  If you need to represent that state on the client prior to save, you would need to make a non-saveable transaction to data B to mimic the server.

Yes that is dumb, but when you do not have control of the server... what can you do.

#### saveEachLatest comming soon.

### Overview!

Transactor creates and manages client side transactions, allowing you to then opperate on them individualy or as a whole.  For example, you could create a transaction for adding several new users to a form, then save them all at once.  Additionaly, Transactor gives access to the transactions and provides methods to super impose the transactions on an existing data set, it allows undo and redo features, and can differntiate between saveable and non saveable transactions.  Lastly each instantiation of Transactor keys its transactions uniquely, meaning you can have multiple transctor instance at once.


### You can 
- Save a sequence of changes to the same set of data
- Create saveable and unsaveable changes
	- Saveable changes will be given to the save handler, where is unsaveable will be ignored and only used locally.
- Undo changes
- Redo changes
- Create 1 or more instances to track 1 or more sets of changes