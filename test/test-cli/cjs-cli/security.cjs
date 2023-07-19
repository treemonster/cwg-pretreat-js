<?js

echo('security.cjs')

function check(xs, p) {
	return xs.map(x=>x && p(x))
}

// console.log(eval('require("commander")'))

// return;

console.log('-- arguments', arguments)

console.log('-- process', check([
	globalThis.process,
	process,
	global.process,
	Function('return this')().process,
	Function('return global')().process,
	echo.constructor('return this')().process,
	echo.constructor('return global')().process,
	echo.constructor.prototype.constructor('return this')().process,
	echo.constructor.prototype.constructor('return global')().process,
	parseInt.constructor('return this')().process,
	parseInt.constructor('return global')().process,
	parseInt.constructor.prototype.constructor('return this')().process,
	parseInt.constructor.prototype.constructor('return global')().process,
], x=>x.pid))


console.log('-- eval', check([
	globalThis.eval,
	eval,
	global.eval,
	Function('return this')().eval,
	Function('return global')().eval,
	echo.constructor('return this')().eval,
	echo.constructor('return global')().eval,
	echo.constructor.prototype.constructor('return this')().eval,
	echo.constructor.prototype.constructor('return global')().eval,
	parseInt.constructor('return this')().eval,
	parseInt.constructor('return global')().eval,
	parseInt.constructor.prototype.constructor('return this')().eval,
	parseInt.constructor.prototype.constructor('return global')().eval,
], x=>{
	try{
		return x('X=2345')
	}catch(e) {}
}))



console.log('-- utils', check([
	globalThis.utils,
	utils,
	global.utils,
	Function('return this')().utils,
	Function('return global')().utils,
	echo.constructor('return this')().utils,
	echo.constructor('return global')().utils,
	echo.constructor.prototype.constructor('return this')().utils,
	echo.constructor.prototype.constructor('return global')().utils,
	parseInt.constructor('return this')().utils,
	parseInt.constructor('return global')().utils,
	parseInt.constructor.prototype.constructor('return this')().utils,
	parseInt.constructor.prototype.constructor('return global')().utils,
], x=>x))




console.log('-- require', check([
	globalThis.require,
	require,
	global.require,
	Function('return this')().require,
	Function('return global')().require,
	echo.constructor('return this')().require,
	echo.constructor('return global')().require,
	echo.constructor.prototype.constructor('return this')().require,
	echo.constructor.prototype.constructor('return global')().require,
	parseInt.constructor('return this')().require,
	parseInt.constructor('return global')().require,
	parseInt.constructor.prototype.constructor('return this')().require,
	parseInt.constructor.prototype.constructor('return global')().require,
], x=>x+''))


delete require.cache[require('path').resolve(__dirname+'/security.js')]
console.log(require('./security.js'))
