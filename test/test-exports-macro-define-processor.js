const processorSync=require('../exports/macro-define-processor')
function buildConfigs(output, predeclare) {
  return {
    indir: __dirname+'/test-exports-macro-define-processor/code',
    outdir: __dirname+'/test-exports-macro-define-processor/code_output_'+output,
    includeRe: /\.(js|css|json|jsx|scss|less|md|html|htm|cjs|njs)$/,
    excludeRe: /^\.DS_/,
    predeclare,
    enableSpacesIndent: false,
  }
}
processorSync(buildConfigs('_typ1', `
#def TYP1
#define ENAME(x) 'Typ1_'+require('crypto').createHash('sha1').update('${Date.now().toString(36)}'+x).digest('hex')
`))
processorSync(buildConfigs('_typ2', `
#def TYP2
#define ENAME(x) 'Typ2_'+require('crypto').createHash('sha1').update('${Date.now().toString(36)}'+x).digest('hex')
`))

console.log('-- completed --')
