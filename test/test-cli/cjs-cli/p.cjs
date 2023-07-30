<?js
console.log(this.response.on.constructor('return global')().eval+'')
console.log(this.response.on.constructor('return this')().eval+'')
console.log(new Function('return this')().eval+'')
console.log(this.response.on.constructor.prototype.constructor('return this')().eval+'')

console.log(eval+'')

require('./z1')