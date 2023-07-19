exports.zz=Math.random()

// console.log(1111)
// console.log(eval('require("commander")'))


function check(xs, p) {
  return xs.map(x=>x && p(x))
}

console.log('-- require() arguments', arguments)
console.log('-'.repeat(32))
console.log('-'.repeat(32))
console.log('-'.repeat(32))
console.log('-'.repeat(32))
console.log('-'.repeat(32))

console.log('-- process - require()', check([
  globalThis.process,
  process,
  global.process,
  Function('return this')().process,
  Function('return global')().process,
  parseInt.constructor('return this')().process,
  parseInt.constructor('return global')().process,
  parseInt.constructor.prototype.constructor('return this')().process,
  parseInt.constructor.prototype.constructor('return global')().process,
], x=>x.pid))


console.log('-- eval - require()', check([
  globalThis.eval,
  eval,
  global.eval,
  Function('return this')().eval,
  Function('return global')().eval,
  parseInt.constructor('return this')().eval,
  parseInt.constructor('return global')().eval,
  parseInt.constructor.prototype.constructor('return this')().eval,
  parseInt.constructor.prototype.constructor('return global')().eval,
], x=>{
  try{
    return x('X=2345')
  }catch(e) {}
}))



console.log('-- require - require()', check([
  globalThis.require,
  require,
  global.require,
  Function('return this')().require,
  Function('return global')().require,
  parseInt.constructor('return this')().require,
  parseInt.constructor('return global')().require,
  parseInt.constructor.prototype.constructor('return this')().require,
  parseInt.constructor.prototype.constructor('return global')().require,
], x=>x+''))


// console.log(require.constructor.prototype.constructor('return this')())
