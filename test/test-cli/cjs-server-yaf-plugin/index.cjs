<?js

setDebugging(1)

define('__APP_PATH__', __dirname)



if(!Application.MEMORY_RECORDER) {

  const seq_maxlen=60*15 // records max count
  const step_count=100 // records count of every request
  const rec_frequence=1 // save checkpoints per second
  const mem=utils.getTimelineRecorder(seq_maxlen, step_count)

  const mb=t=>(t/1024/1024).toFixed(2)

  const run=_=>{
    const {
      rss,
      heapTotal,
      heapUsed,
      external,
    }=process.memoryUsage()
    mem.push({
      rss: mb(rss),
      heapTotal: mb(heapTotal),
      heapUsed: mb(heapUsed),
      external: mb(external),
    })
    setTimeout(run, rec_frequence*1e3)
  }
  run()

  function getMemoryInfo(after) {
    return [
      seq_maxlen,
      rec_frequence,
      mem.listAfter(after),
    ]
  }

  Application.MEMORY_RECORDER={getMemoryInfo}
}
define('getMemoryInfo', Application.MEMORY_RECORDER.getMemoryInfo)



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

// console.log(await curl({url: 'https://www.baidu.com'}))

define('__ASSETS_PATH__',  __APP_PATH__+'/public')

define('sleep', t=>new Promise(r=>setTimeout(r, t)))

const app = new Yaf_Application(__dirname+'/application.ini')
// await app.bootstrap()
await app.run()