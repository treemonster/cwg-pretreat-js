const fs=require('fs')
const CRLF='\r\n\r\n'
function write_md(name, ls) {
	const p=fs.createWriteStream(__dirname+'/'+name+'.md')
	p.write('# '+name+CRLF)
	for(let o of ls) {
	  p.write('## '+o.name+CRLF)
	  for(let fn of o.from) {
	  	const e=fs.readFileSync(__dirname+'/../'+fn, 'utf8')
	  	const v=e.split('\n')
	  	const is=(a, b)=>a.indexOf(b)>-1
	  	for(let i=0; i<v.length; i++) {
  	  	if(!is(v[i], '@docs/'+o.name)) continue
  	  	let o1={line: -1, define: [], name: '', desc: [], params: [], returns: [], examples: []}
	  	  let cur=null
	  	  i++
  	  	for(;i<v.length && v[i].indexOf('*/')<0; i++) {
    	  	if(is(v[i], '@desc')) {
    	  		cur=o1.desc
    	  	}else if(is(v[i], '@define')) {
    	  		cur=o1.define
    	  	}else if(is(v[i], '@params')) {
    	  		cur=o1.params
    	  	}else if(is(v[i], '@returns')) {
    	  		cur=o1.returns
    	  	}else if(is(v[i], '@examples')) {
    	  		cur=o1.examples
    	  	}else if(cur) {
    	  		const r=v[i].replace(/^[\s\*]+\*|\s*$/, '')
    	  		if(r) cur.push(r)
    	  	}
    	  }
    	  o1.line=i+2
    	  if(o1.define.length) {
    	  	o1.name=o1.define[0]
    	  }else{
      	  const _p=v[i+1].match(/(?:const\s+|function\s+)?([a-z\d_]+)[:=>\s]*(?:async\s+)?(\([^)]*\)|[a-z\d_]+)/i)
      	  o1.name=`${_p[1]}${_p[2].indexOf('(')===0? _p[2]: '('+_p[2]+')'}`
      	}
    	  p.write(`### \`${o1.name}\`${CRLF}`)
    	  p.write(o1.desc.map(a=>`> `+a).join(CRLF)+CRLF)
    	  p.write(`> Defined in \`${fn}\` line ${o1.line}${CRLF}`)
    	  p.write(`##### Parameters${CRLF}`)
    	  p.write(o1.params.length? o1.params.map(a=>`- ${a}`).join(CRLF): 'None.')
    	  p.write(CRLF)
    	  p.write(`##### Returns${CRLF}`)
    	  p.write(o1.returns.length? o1.returns.map(a=>`- ${a}`).join(CRLF): 'None.')
    	  p.write(CRLF)
    	  p.write(`##### Examples${CRLF}`)
    	  if(!o1.examples.length) {
    	  	p.write('None.')
    	  	p.write(CRLF)
    	  }else{
      	  p.write('```javascript\n')
      	  p.write(o1.examples.join('\r\n'))
      	  p.write('\r\n```'+CRLF)
      	}
    	  p.write('---'+CRLF)
    	  i++
	  	}
	  }
	}
}

write_md('cjs', [
  {name: 'functions', from: [
    'libs/engines/template.js',
    'libs/utils/base.js',
  	//'exports/simple-template-server.js',
  ]},
])