<?js

setDebugging(1)

define('__APP_PATH__', __dirname)

__autoload_classes(classname=>{
  // console.log("##>>", classname)
  function fn2camelcase(fn) {
    return fn.replace(/(?:_|^)([a-zA-Z])/g, (_, v)=>'/'+v.toUpperCase())
  }
  function end_with(x, v) {
    return x.substr(x.length-v.length)===v
  }
  if(end_with(classname, 'Controller')) {
    if(classname.indexOf('_')===-1) classname='index_'+classname
    const [module, controller]=classname.split('_')
    if(module==='index') {
      return __APP_PATH__+'/controllers/'+fn2camelcase(controller)+'.cjs'
    }else{
      return __APP_PATH__+'/modules/'+module+'/controllers/'+fn2camelcase(controller)+'.cjs'
    }
  }else if(end_with(classname, 'Model')) {
    return __APP_PATH__+'/models/'+fn2camelcase(classname)+'.cjs'
  }
})

define('__ASSETS_PATH__',  __APP_PATH__+'/public')

define('sleep', t=>new Promise(r=>setTimeout(r, t)))

const app = new Yaf_Application(__dirname+'/application.ini')
// await app.bootstrap()
await app.run()