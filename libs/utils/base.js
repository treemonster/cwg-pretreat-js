const fs=require('fs')

function getTextFile(fn) {
  const p=fs.statSync(fn)
  return {
    lastModifiedKey: p.mtime.getTime().toString(36),
    readContentSync: _=>fs.readFileSync(fn).toString('utf8'),
  }
}

function existsFile(fn) {
  try{
    return fs.statSync(fn).isFile()
  }catch(e) {}
  return false
}

function md5(str) {
  return require('crypto').createHash('md5').update(str).digest('hex')
}

const path=require('path')
const PACKAGE_DIR=path.resolve(__dirname+'/../..')+path.sep
function isPackageFile(_access_file) {
  return _access_file.indexOf(PACKAGE_DIR)===0
}

function loadOrSetCache(caches, {filename, mockFileContent, wrapper}, buildOpcodeFunc) {
  const wrapperKey=wrapper? (wrapper._key=wrapper._key || wrapper.toString()): '\n'
  const [lastModifiedKey, cache_filename, readContentSync]=(_=>{
    if(mockFileContent) {
      const lastModifiedKey=md5(mockFileContent)+md5(wrapperKey)
      const cache_filename='mockFileContent://'+filename
      return [lastModifiedKey, cache_filename, _=>mockFileContent]
    }else{
      const {lastModifiedKey, readContentSync}=getTextFile(filename)
      return [lastModifiedKey+':'+md5(wrapperKey), filename, readContentSync]
    }
  })()
  caches[cache_filename]=caches[cache_filename] || {}
  const fileCache=caches[cache_filename]
  if(fileCache.lastModifiedKey===lastModifiedKey && fileCache.opcode) {
    return fileCache.opcode
  }
  delete fileCache.opcode
  fileCache.lastModifiedKey=lastModifiedKey
  fileCache.opcode=buildOpcodeFunc(
    wrapper? wrapper(filename, readContentSync()) || readContentSync(): readContentSync()
  )
  return fileCache.opcode
}

function defer() {
  let resolve, reject
  const promise=new Promise((_resolve, _reject)=>{
    resolve=_resolve
    reject=_reject
  })
  return {promise, resolve, reject}
}


function getTimeRecorder() {
  const records=[], _t=Date.now()
  function cost() {
    return Date.now()-_t
  }
  function add_checkpoint(name) {
    const v=records.length? records[records.length-1].cost: 0
    const _cost=cost()
    records.push({name, cost: _cost, step_cost: _cost-v})
  }
  function summary() {
    return records
  }
  return {
    cost,
    add_checkpoint,
    summary,
  }
}

function getLocalIpv4Addresses() {
  let rr={'127.0.0.1':1}
  try{
    const ii=require('os').networkInterfaces()
    for(let a in ii) {
      ii[a].map(x=>{
        if(!x.family.match(/IPV4/i)) return;
        rr[x.address]=1
      })
    }
  }catch(e) {}
  return Object.keys(rr)
}

async function getAvailablePort() {
  if(require('cluster').isWorker) {
    console.log('`getAvailablePort` can only be called in Master process')
    return 0
  }
  const [min, max]=[20001, 50000]
  const net=require('net')
  async function _available(port) {
    let success=false
    try{
      const v=net.createServer().listen(port)
      success=true
      await new Promise(r=>v.close(r))
    }catch(e) {}
    return success
  }
  for(;;) {
    const port=Math.floor(Math.random()*(max-min)+min)
    if(!_available(port)) continue
    return port
  }
}


function readrs(rs) {
  const ret=[]
  return new Promise((resolve, reject)=>{
    rs.on('data', buf=>ret.push(buf))
    rs.on('end', _=>{
      resolve(Buffer.concat(ret))
    })
    rs.on('error', e=>{
      reject(e)
    })
  })
}

let _code=0
function getUniqueCode() {
  return _code++
}


const WORKER_PRIVATE_PORT=getUniqueCode()
async function loadBalance(workersCount, workerHandler, masterHandler, silentMode=false) {
  const cluster=require('cluster')
  const log=silentMode? (_=>0): (...x)=>console.log(...x)
  if (cluster.isWorker) {
    log(`worker ${process.pid} started`)
    workerHandler(process.env.FPM_externalPort)
  }else{
    log(`Master ${process.pid} is running, workers count: ${workersCount}`)
    let workersCounter=0
    let workersData={}
    const fork_worker=async idx=>{
      if(workersCounter>=workersCount) return;
      workersCounter++
      const FPM_externalPort=await getAvailablePort()
      const worker=cluster.fork({
        FPM_externalPort,
        FPM_workerIndex: idx,
        FPM_workersCount: workersCount,
      })
      const pid=worker.process.pid
      workersData[pid]={
        FPM_externalPort,
      }
    }
    cluster.on('exit', (worker, code, signal) => {
      const pid=worker.process.pid
      log(`worker ${pid} died`)
      const _idx=workersData[pid].workerIndex
      delete workersData[pid]
      workersCounter--
      fork_worker(_idx)
    })
    for(let i=0; i<workersCount; i++) {
      fork_worker(i)
    }
    masterHandler(workersData)
  }
}

function getTimelineRecorder(maxlen, stepcount) {
  const seq=[]
  function push(x) {
    seq.push({data: x, time: Date.now()})
    if(seq.length<=maxlen) return;
    seq.shift()
  }
  function listAfter(t) {
    for(let i=0; i<seq.length; i++) {
      if(seq[i].time<=t) continue
      return seq.slice(i, stepcount)
    }
    return []
  }
  return {
    push,
    listAfter,
  }
}


/*
 This function is not a complete implementation of an ini file parser.
 Some nested expressions may be parsed incorrectly.
 */
function simpleINIParser(v, fn, _ini={}, _handler=null) {
  const pfn=path.parse(fn)
  const ini=_ini, o={}
  const lines=v.split('\n')
  for(let i=0; i<lines.length; i++) {
    const li=lines[i].trim()
    li.replace(/^(?:;.*|\[([^\]]+)\]|([^=\s]+)\s*=\s*(.*?))\s*(?:;(.*))?$/, (_, ns, key, value, comment)=>{
      if(ns) {
        o.ns=ns
        ini[o.ns]=ini[o.ns] || {}
        o.rules=ini[o.ns]
      }else if(key) {
        let p=value.split(/\s+/).filter(a=>a).reduce((s, x)=>{
          return s+(x.match(/^(['"])(.+?)\1$|$/)[2] || (_=>{
            return ({
              __dirname: pfn.dir,
              __filename: fn,
            })[x] || ini[o.ns][x] || x
          })())
        }, '')
        const val=parseINIValue(p)
        const keys=key.split('.').filter(a=>a)
        keys.reduce((o, x, i)=>{
          if(_handler!==null) {
            _handler(ini, x, keys, {
              rawValue: value,
              value: val,
              comment,
            })
          }
          if(i===keys.length-1) {
            o[x]=val
            if(comment) {
              o['.comment:'+x]=comment.trim()
            }
          }else{
            o[x]=o[x] || {}
            return o[x]
          }
        }, o.rules)
      }
    })
  }
  return ini
}

function parseINIValue(p) {
  if(+p+''===p) return +p
  if(['on', 'yes', 'true'].includes((p+'').toLowerCase())) {
    return true
  }
  if(['off', 'no', 'false'].includes((p+'').toLowerCase())) {
    return false
  }
  return p
}

module.exports={
  readrs,
  existsFile,
  getTextFile,
  loadOrSetCache,
  getAvailablePort,
  defer,
  getTimeRecorder,
  getLocalIpv4Addresses,
  getUniqueCode,
  loadBalance,
  isPackageFile,
  getTimelineRecorder,
  simpleINIParser,
  parseINIValue,
}
