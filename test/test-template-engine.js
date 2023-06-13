const {
  prehandleFileAsync,
}=require('../libs/engines/template')
const t=Date.now()
; (async _=>{
	for(let i=0; i<3; i++) {
		const {output}=await prehandleFileAsync({
			filename: __dirname+'/test-template-engine/index.cjs',
			// mockFileContent: '---',
		}, {
    	engine: 'templateEngine',
    })
  	console.log(output)
	}
	console.log('total cost:', (Date.now()-t)+'ms')
})()
