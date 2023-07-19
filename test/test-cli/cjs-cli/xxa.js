exports.x=22

function test(v, vv) {
  console.log('-- test in require(): '+vv+' --')
  console.log(v.constructor('return this')().eval+'')
  console.log(v.constructor.prototype.constructor('return this')().eval+'')
  console.log(v.constructor('return this')().utils)
  console.log(v.constructor.prototype.constructor('return this')().utils)
  console.log()
}

test(eval, 'eval')
test(parseInt, 'parseInt')
console.log('-- direct: ', Function('return this')())
//setTimeout('console.log("in settimeout", global, this)')

/*
console.log(223, process)
//console.log(setTimeout.constructor('return this')(), global)

// eval is available in the custom modules
// but the constructor of `eval` has already replaced by the `Function` in the vm context
console.log('>', process, this.eval, global.eval, eval,
  require.constructor.prototype.constructor('return this')())
// eval('a=2'), eval.constructor.prototype.constructor('return this')()===this, this)
// console.log(require('react'))
//console.log(this)

// console.log(require('os'))

console.log('--', eval, this.eval, global.eval, eval.constructor.prototype.constructor('return this.eval')())
*/