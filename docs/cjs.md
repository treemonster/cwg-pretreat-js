# cjs

## functions

### `echo(...argv)`

>  Appends multiple values to the output.

> Defined in `libs/engines/template.js` line 174

##### Parameters

-  `...any`: An array containing anything that can be serialized. Such as strings, numbers, Promises, etc.

##### Returns

None.

##### Examples

```javascript
 echo(1, 'xx', Promise.resolve('yyy'))
```

---

### `__autoload_classes(func)`

>  Specifies the autoload rules of undefined classes.

> Defined in `libs/engines/template.js` line 219

##### Parameters

-  `func`: A callback function which returns the filepath of the current classname.

##### Returns

-  File path string.

##### Examples

```javascript
 
 // X1.cjs
 
 <?js
 class X1{
   static log() {
     return 'X1 log'
   }
 }
 
 
 
 // index.cjs
 
 <?js
 
 __autoload_classes(classname=>{
   if(classname==='X1') return __dirname+'/X1.cjs'
   // you can write more mapping rules here
 })
 
 // Although the `X1` class is undefined in this context, it will be autoloaded here
 // because we have specified the filename of this class in the `__autoload_classes` function.
 // So we do not need to write some redundant codes to include the class file explicitly.
 echo(X1.log())
 
 
 // run index.cjs
 
 cjs cli -f index.cjs
 
```

---

### `__autoload_libraries(func)`

>  Specifies the autoload rules of undefined libraries.

> Defined in `libs/engines/template.js` line 268

##### Parameters

-  `func`: A callback function which returns the filepath of the current library.

##### Returns

-  File path string.

##### Examples

```javascript
 
 // Y1.cjs
 
 <?js
 function log() {
   return 'Y1 log'
 }
 exports({
   library_functions: {
     log,
   }
 })
 
 
 
 // index.cjs
 
 <?js
 
 __autoload_libraries(libname=>{
   if(libname==='Y1') return __dirname+'/Y1.cjs'
   // you can write more mapping rules here
 })
 
 // Although the `Y1` class is undefined in this context, it will be autoloaded here
 // because we have specified the filename of this library in the `__autoload_libraries` function.
 // So we do not need to write some redundant codes to include the library file explicitly.
 echo(Y1.log())
 
 
 // run index.cjs
 
 cjs cli -f index.cjs
 
```

---

### `exports(obj)`

>  Exports variables.

> Defined in `libs/engines/template.js` line 328

##### Parameters

-  `obj`: A special object that is used to define the public interface of a module. Just like the `module.exports` object of Node.js.

##### Returns

None.

##### Examples

```javascript
 
 
 // L1.cjs
 <?js
 exports({
   xx: 1,
   func: _=>{
     return 22
   }
 })
 
 // index.cjs
 <?js
 const v=await include_file(__dirname+'/L1.cjs')
 console.log(v)
```

---

### `include_file(inc_filename, private_datas)`

>  Import a cjs module from a specified path. It is an asynchronous function which returns a Promise. Just like the `import` function of Node.js.

> Defined in `libs/engines/template.js` line 360

##### Parameters

-  `inc_filename`: The cjs module path.

-  `private_datas`: Specifies extra global variables for the imported module.

##### Returns

None.

##### Examples

```javascript
 
 // L1.cjs
 <?js
 function test() {
   return A1+A2 // Note: Both A1 and A2 are global variables which are provided by the caller.
 }
 exports({
   test,
 })
 
 // index.cjs
 <?js
 const v=await include_file(__dirname+'/L1.cjs', {A1: 11, A2: 22})
 echo(v.test())
```

---

### ` require(module)`

>  A function which has similar behaviors of `require` function in Node.js.

> Defined in `libs/engines/template.js` line 445

##### Parameters

-  `module`: The wanted module path.

##### Returns

None.

##### Examples

None.

---

### `eval(code)`

>  Execute specified code in current context.

> Defined in `libs/engines/template.js` line 462

##### Parameters

-  `code`: The code string.

##### Returns

-  The last value.

##### Examples

None.

---

### `defer()`

>  An implementation of Promise.defer

> Defined in `libs/utils/base.js` line 79

##### Parameters

None.

##### Returns

None.

##### Examples

None.

---

### `sleep(t)`

>  A simple function which returns a `Promise` object that will be resolved in the specified time.

> Defined in `libs/utils/base.js` line 219

##### Parameters

None.

##### Returns

None.

##### Examples

```javascript
 
 // index.cjs
 <?js
 await sleep(1e3) // delay 1 second
 echo('done')
```

---

