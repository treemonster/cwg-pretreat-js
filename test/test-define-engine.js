const {getParser}=require(__dirname+'/../libs/engines/define')
const parse=getParser({
  tokens: {
    T_CALL_DEFINE: '@',
  },
  enableSpacesIndent: true,
})

function test(fn, predeclare='') {
  console.log('-'.repeat(32))
  console.log({fn, predeclare})
  console.log(parse(__dirname+'/test-define-engine/'+fn, predeclare))
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