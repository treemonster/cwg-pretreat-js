<?js

setDebugging(0)

__autoload_classes(classname=>{
  // console.log("##>>", classname)
  function fn2camelcase(fn) {
    return fn.replace(/(_|^)[a-z]/g, _=>_.toUpperCase())
  }
  if(classname.indexOf('_')===-1) classname='index_'+classname
  const [module, controller]=classname.split('_')
  if(module==='index') {
    return __dirname+'/controllers/'+fn2camelcase(controller)+'.cjs'
  }else{
    return __dirname+'/modules/'+module+'/controllers/'+fn2camelcase(controller)+'.cjs'
  }
})

define('__APP_PATH__', __dirname)
define('__PROJ_PATH__', __dirname+'/../../..')
define('__VIEW_PATH__', __APP_PATH__+'/views')
define('__ASSETS_PATH__',  __APP_PATH__+'/public')

define('sleep', t=>new Promise(r=>setTimeout(r, t)))

const app = new Yaf_Application(__dirname+'/application.ini')

await app.run()
