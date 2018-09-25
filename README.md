![alt text][logo]

[logo]: https://iamdanielcassil.github.io/icon.png
# Transactor

Transactor is a simple library that helps to keep track of local transactional changes to data.

# Demo Site and Video
https://iamdanielcassil.github.io/
<video width="320" height="240" controls>
  <source src="video.mov" type="video/mp4">
</video>

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
  {id, {id, value: 'test'}, options},
  {id, {id, value: 'test change'}, options},
  {id, {id, value: 'test change three'}, options},
]
```
#### get latest edge data
```javascript
let data = transaction.getLatest();

// expected data
[
  {id, {id, value: 'test change three'}, options},
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

#### saveable vs non-saveable transactions
depnding on what type of data and why you are making transactions, you may need to create client side only transactions.  

This feature was purpose built for the case where a server manipulates data on save, and the client needs to mimic that behavior.  For example saving data A, causes an update to data B done by the server on save.  If you need to represent that state on the client prior to save, you would need to make a non-saveable transaction to data B to mimic the server.

Yes that is dumb, but when you do not have control of the server... what can you do.

#### add, update, delete
transactor.add can be called with an options object.
```javascript
transactor.add(id, data, {add: true))
transactor.add(id, data, {update: true)) // default if none provided
transactor.add(id, data, {delete: true))
```
if these options are used you must give transactor the associated work functions on save.
transactor.save(updateFunction, addFunction, deleteFunction)

additionaly, delete: true is used for the superimpose(data) function described below.

#### superimpose
as a convinenece, transactor now has a superimpose function that can correctly modify a provided set of data to account for all transactional changes.
```javascript
clientData = [{id: 1, val: 'test'}]
transactor.add(1, {id: 1, val: 'update test'})

transactor.superimpose(clientData.map(cd => { return { id: cd.id, data: cd }}));

// expected results
[{id: 1, {id: 1, val: 'update test'}}]
```
when used with options= {delete:true}
```javascript
clientData = [{id: 1, val: 'test'}]
transactor.add(1, {}, {delete: true})

// expected results
[]

```
### Overview!

Transactor creates and manages client side transactions, allowing you to then opperate on them individualy or as a whole.  For example, you could create a transaction for adding several new users to a form, then save them all at once.  Additionaly, Transactor gives access to the transactions and provides methods to super impose the transactions on an existing data set, it allows undo and redo features, and can differntiate between saveable and non saveable transactions.  Lastly each instantiation of Transactor keys its transactions uniquely, meaning you can have multiple transctor instance at once.


### You can 
- Save a sequence of changes to the same set of data
- Create saveable and unsaveable changes
	- Saveable changes will be given to the save handler, where is unsaveable will be ignored and only used locally.
- Undo changes
- Redo changes
- Create 1 or more instances to track 1 or more sets of changes