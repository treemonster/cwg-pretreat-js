/**
 usage:

 open `cjs.inject.js`` and write some codes like this:

 module.exports={
   EXTENDS: (wCtx, globals)=>({
     get_module_dir: _=>{
       return ctx.fn.replace(/\\+/g, '/').replace(/(^.*?src\/modules\/[^/]+).*$/, '$1')+'/'
     },
     IS_NODE_TARGET: globals.webpackLoaderThis.target==='node',
   }),
   TPLS: [
     /\.jsx?$/, ctx=>{
       let {str, fn}=ctx
     }
   ],
 }

 append a loader config in webpack.conf.js

 {
   test: /\.(jsx?)$/,
   exclude: /node_modules/,
   options: {
     file: path.resolve(__dirname+'/cjs.inject.js'),
     watch: false,
   },
   loader: 'cwg-pretreat-js/exports/webpack-template-loader.js',
 }

 */

const {
  prehandleFileAsync,
}=require('../libs/engines/template')


const path=require(`path`)
let win_safe_dir=p=>p.replace(/\\+/g, '/')

const fs=require('fs')
const _watches={}
function remove_cache_once_change(filename, onChange) {
  let f2=path.resolve(filename)
  if(_watches[f2]) return;
  _watches[f2]=1
  fs.watch(f2, _=>{
    delete require.cache[f2]
    if(typeof onChange==='function') onChange(f2)
  })
}

module.exports=async function(str) {
  let query=this.query || {}
  if(this.query) {
    const {file, watch}=this.query
    if(file) {
      if(watch) remove_cache_once_change(file, watch)
      query=Object.assign({}, require(file))
    }
  }

  const {
    EXTENDS=(wCtx=>({})),
    TPLS=[],
  }=query

  let wCtx={
    str: str,
    fn: win_safe_dir(path.resolve(this.resourcePath)),
    webpackLoaderThis: this,
  }
  const globals=Object.assign(EXTENDS(wCtx), {wCtx})
  wCtx.runtimeGlobals=globals

  let callback=this.async()
  try{
    const {output}=await prehandleFileAsync({
      filename: wCtx.fn,
      mockFileContent: wCtx.str,
    }, globals)

    wCtx.str=output

    for(let i=0; i<TPLS.length; i+=2){
      const [_match, _handler]=[TPLS[i], TPLS[i+1]]
      if(wCtx.fn.match(_match)) wCtx.str=await _handler(wCtx, globals)
    }
    callback(null, wCtx.str)
  }catch(e) {
    callback(e)
  }

}
