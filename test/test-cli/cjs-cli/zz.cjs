<?js

function test(v, vv) {
	console.log('-- test: '+vv+' --')
  console.log(v.constructor('return this')().eval+'')
  console.log(v.constructor.prototype.constructor('return this')().eval+'')
  console.log(v.constructor('return this')().utils)
  console.log(v.constructor.prototype.constructor('return this')().utils)
  console.log()
}
test(parseRange, 'parseRange')
test(echo, 'echo')
test(curl, 'curl')
test(parseInt, 'parseInt')
console.log('-- direct: ', Function('return this')())

echo(19191)
// console.log(Object.keys(require.cache))
delete require.cache[require('path').resolve(__dirname+'/xxa.js')]
console.log(require('./xxa').x)
// console.log(require('fs'), curl.constructor('return this')().utils)
return;
console.log(process, utils)

await new Promise(r=>setTimeout(r, 100))
console.log(header.constructor.prototype.constructor('return this')())
// console.log(header.constructor.prototype===eval.constructor.prototype)
// console.log(securityConfig)
// console.log(eval('a=22'))
echo(777)
console.log(">#$>", require.constructor.prototype.constructor('return this.eval')())
return;
// console.log(global)
///console.log(require.constructor('return this')())
// console.log(require('./node_modules/cwg-walker'))
console.log(require('commander').options)
console.log(require('./xxa'))
// console.log(eval('this'))
// console.log(eval.constructor('return this')())
// console.log(eval('a=2'))
// console.log(__UNSAFE__.eval.constructor('return this')())
console.log(JSON.stringify({a:2}), /sa/, Function.prototype.constructor('return this')(), new RegExp, Object, {}, [], Array)
curl('https://baidu.com').then(a=>console.log(a))
