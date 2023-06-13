const {parsePredeclare, prehandleFileSync}=require(__dirname+'/../libs/engines/define')
function test(fn, predeclare='') {
  console.log('-'.repeat(32))
  console.log({fn, predeclare})
  const predeclareCtx=parsePredeclare(predeclare)
  console.log(prehandleFileSync(__dirname+'/test-define-engine/'+fn, predeclareCtx, true))
  console.log('-'.repeat(32))
  console.log('\n\n\n')
}

const t=Date.now()
for(let i=0; i<3; i++) {

test('test')


test('index', `
#def XX
#define HAPPY fatigue :(
#define UPPER(x) x.toUpperCase()
`)


test('index', `
#def YY
`)
}
console.log('cost: '+(Date.now()-t)+'ms')