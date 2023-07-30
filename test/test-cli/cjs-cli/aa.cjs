<?js
a=222
console.log('---', eval('a=2; require'))
delete require.cache[require('path').resolve('./aa.js')]
require('./aa')
console.log(a)
// const os=require('os')
// console.log(os)

/*
utils.ZZ=22
utils.isPackageTestFile=_=>false
utils.isPackageFile=_=>true

delete require.cache[require('path').resolve('./aa.js')]
require('./aa')
*/
