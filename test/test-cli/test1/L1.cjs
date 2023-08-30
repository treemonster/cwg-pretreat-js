 <?js
 function test() {
   return A1+A2 // Note: Both A1 and A2 are global variables which are provided by the caller.
 }
 exports({
   test,
 })