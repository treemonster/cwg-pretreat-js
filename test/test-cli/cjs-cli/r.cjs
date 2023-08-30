<?js
echo(1112)
delete require.cache[__dirname+'/aa.js']
console.log(require(__dirname+'/aa.js'))