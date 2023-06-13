
const {
  prehandleFileAsync,
  getNewContext,
}=require('../libs/engines/template')
const {
  defer,
  readrs,
  getLocalIpv4Addresses,
  existsFile,
  getUniqueCode,
  loadBalance,
  isPackageFile,
  getTimeRecorder,
  getTimelineRecorder,
}=require('../libs/utils/base')

const fs=require('fs')
const path=require('path')

process.on('uncaughtException', e=>{
  console.log('uncaughtException:', e)
})

const PLUGINS_PATH=__dirname+'/simple-template-server/plugins'
const plugins=fs.readdirSync(PLUGINS_PATH).reduce((x, v)=>{
  if(v.match(/^[a-z\dA-Z].+?\.cjs$/)) x[path.parse(v).name]=PLUGINS_PATH+'/'+v
  return x
}, {})

const MIME={
  'js': 'text/javascript; charset=utf8',
  'css': 'text/css',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'gif': 'image/gif',
  'txt': 'text/plain; charset=utf8',
  'html': 'text/html; charset=utf8',
}

function get_memory_recorder() {

  const seq_maxlen=7200 // records max count
  const step_count=200 // records count of every request
  const rec_frequence=1 // save checkpoints per second
  const mem=getTimelineRecorder(seq_maxlen, step_count)

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

  return {getMemoryInfo}
}

let getMemoryInfo=null
function startup(options) {
  const {
    COMMON_options,
    FastCGI_options,
    FPM_options,
    isWorker,
  }=options

  const {
    silent,
    monitor,
  }=COMMON_options

  if(!silent && !isWorker) {
    console.log()
    console.log('`simple-template-server` is launching with the options below:')
    console.log(options)
    console.log('please wait ..')
  }

  if(monitor) {
    getMemoryInfo=get_memory_recorder().getMemoryInfo
  }
}

function log_server_info(serverName, listen, locally) {
  console.log()
  console.log(serverName+' has been launched on the following addresses:')
  const addr=locally? ['127.0.0.1']: getLocalIpv4Addresses()
  addr.map(ipv4=>{
    console.log('> http://'+ipv4+':'+listen+'/')
  })
}

function start_server({
  listen,
  CGI_options,
  COMMON_options,
  sharedGlobals,
}) {
  if(!listen) {
    setImmediate(_=>process.exit(1))
    throw new Error('server port is not valid: '+listen)
  }
  CGI_options=CGI_options || {
    exts: ['.cjs' ],
    index: ['index.cjs'],
    error: 'index.cjs',
    forbidden: ['node_modules'],
    walk: false,
  }
  const {
    monitor=true,
    locally=false,
    silent=false,
  }=COMMON_options
  const msrv=require('http').createServer((req, res)=>{
    CGI(CGI_options, COMMON_options, sharedGlobals, req, res)
  })
  msrv.listen(listen, locally? '127.0.0.1': '0.0.0.0')
}

/**
 * CGI function procedures:
 *
 * 1. parse the request object to get a relative path, and build `globals` variable
 * 2. use relative path as filename
 * 3. if the filename refers to a directory, then the filename specified in `index` param will be instead
 * 4. throw errors if failed to obtain an available filename (if you have set a fallback filename in `error` param, then that file will handle the error instead)
 * 5. execute the file if it is executable or just send its content if it is static
 */
async function CGI(CGI_options, COMMON_options, sharedGlobals, req, res) {
  let {
    exts=['.html', '.cjs'],
    index=['index.cjs', 'index.html'],
    error='error.cjs',
    forbidden=['node_modules'],
    walk=true,
    debugging=false,
  }=CGI_options
  const {
  	silent=false,
  }=COMMON_options
  const {basedir}=sharedGlobals

  const {url, headers, method}=req
  const req_fullurl=url.match(/^https?\:\/\//)? url: 'http://'+headers.host+url
  const {
    pathname,
    query,
  }=require('url').parse(req_fullurl)
  const req_pathname=path.normalize(unescape(pathname)).replace(/[\\\/]+/g, '/')
  const req_query=require('querystring').parse(query)
  const req_body_reader_defer=defer()
  const req_body_defer=defer()
  req_body_reader_defer.promise.then(asUTF8String=>{
    readrs(req).then(rs=>{
      req_body_defer.resolve(asUTF8String? rs.toString('utf8'): rs)
    }, e=>{
      req_body_defer.reject(e)
    })
  })
  const response={
    headerFlushed: false,
    alreadyResponsed: false,
    statusCode: 200,
    headers: {
      'content-type': 'text/html',
    },
    response: '',
  }
  function _flushHeaders() {
    if(response.headerFlushed) return;
    response.headerFlushed=true
    res.writeHead(response.statusCode, response.headers)
  }
  let _debugging=debugging
  const globals={
  	RUNTIME_MODE: 'CGI',
    CGI_options,
    COMMON_options,
    getMemoryInfo,
    request: req,
    response: res,
    url: req_fullurl,
    pathname: req_pathname,
    rawQuery: query,
    query: req_query,
    method,
    headers,
    getPostData: async (asUTF8String=true)=>{
      req_body_reader_defer.resolve(asUTF8String)
      return req_body_defer.promise
    },
    parseRange: _=>{
      if(!headers['range']) return null
      const [, start, end]=headers['range'].match(/^bytes=(\d+)?-(\d+)?/) || []
      const tonum=x=>x===undefined? x: +x
      return [_tonum(start), _tonum(end)]
    },
    endWithFile: (file)=>{
      if(file+''===file) {
        file={filename: file}
      }
      if(!file.mime) {
        file.mime=MIME[path.parse(file.filename).ext.substr(1)]
      }
      const {filename, content, range, mime}=file
      if(!filename) {
        throw new Error('unsupported arguments: '+JSON.stringify({filename, content, range, mime}))
      }
      response.alreadyResponsed=true
      if(mime) {
        Object.assign(response.headers, {
          'content-type': mime,
        })
      }else{
        Object.assign(response.headers, {
          'content-disposition': 'attachment; filename="'+encodeURIComponent(path.parse(filename).base)+'"',
          'content-type': 'application/octet-stream',
        })
      }
      if(content) {
        response.headers['content-length']=Buffer.from(content).byteLength
        _flushHeaders()
        res.end(content)
      }else if(range) {
        response.statusCode=206
        response.headers['accept-ranges']='bytes'
        const fsize=fs.statSync(filename).size
        let [start, end]=range
        if(start===undefined) start=0
        if(end===undefined) end=fsize-1
        Object.assign(response.headers, {
          'content-length': end-start+1,
          'content-range': `bytes ${start}-${end}/${fsize}`,
        })
        _flushHeaders()
        fs.createReadStream(filename, {start, end}).pipe(res)
      }else{
        const fsize=fs.statSync(filename).size
        response.headers['content-length']=fsize
         _flushHeaders()
        fs.createReadStream(filename).pipe(res)
      }
    },
    header: (key, value)=>{
      response.headers[key]=value
    },
    setStatusCode: status=>{
      response.statusCode=status
    },
    setDebugging: debug=>{
      _debugging=debug? true: false
    },
    isDebugging: _=>{
      return _debugging===true
    },
    error: null,
  }

  Object.assign(globals, sharedGlobals)

  function _error_end(e) {
    response.statusCode=500
    delete response.headers['content-type']
     _flushHeaders()
    if(debugging || _debugging) {
      res.end(e.stack || 'unknown error')
    }else{
    	if(!silent) {
        console.log(e)
      }
      res.end('To see more details of this error, please check the console outputs, or use `setDebugging(1)` in your codes to active debugging mode')
    }
  }

  let _access_file=path.resolve(basedir+'/'+req_pathname)
  try{
    const _is_forbidden=!isPackageFile(_access_file) && forbidden.find(a=>_access_file.indexOf(a)>-1)
    if(_is_forbidden) {
      throw new Error('current route is forbidden')
    }
    const stat=fs.statSync(_access_file)
    if(stat.isDirectory()) {
      if(index) {
        for(let i=0; i<index.length; i++) {
          let _next_file=_access_file+'/'+index[i]
          if(!existsFile(_next_file)) continue
          _access_file=_next_file
          break
        }
      }
      if(!index || !existsFile(_access_file)) {
        if(!walk) {
          throw new Error('the administrator disallowed walking directory')
        }else{
          _access_file={
            filename: '@walker.cjs',
            mockFileContent: `<?js
            walker_display(walker_parse({
              root: basedir,
              target: pathname,
            }))
            `,
          }
        }
      }
    }else if(!stat.isFile()) {
      throw new Error('`'+req_pathname+'` is not accessible')
    }
  }catch(e) {
    globals.error=e
    if(error) {
      _access_file=path.resolve(basedir, error)
    }else{
      _access_file=null
    }
  }

  if(!_access_file) {
    _error_end(globals.error)
    return
  }

  if(typeof _access_file==='string') {
    const _ext=path.parse(_access_file).ext
    if(!exts.includes(_ext)) {
      globals.endWithFile({
        filename: _access_file,
      })
      return
    }
  }

  prehandleFileAsync(_access_file, globals, null, {
    beforeExecuteSync: (ctx, __SINGLETON__)=>{
      // this is the entry of request handler
      // following code will only be called once a new request comes

      const {interfaces, shared}=__SINGLETON__

      // auto load plugins
      // plugins are a special type of library
      // so they should follow the rules of library
      // every plugin should export its public functions
      for(let key in plugins) {
        ctx.include_library_sync(key, plugins[key])
      }

      // define function let users can define a global variable
      interfaces.define=(k, v)=>{
        if(interfaces[k]) {
          throw new Error('`'+k+'` has already been defined')
        }
        interfaces[k]=v
      }
      interfaces.defined=(k)=>{
        return interfaces.hasOwnProperty(k)
      }

    },
  }).then(({output})=>{
    if(response.alreadyResponsed) return;
    _flushHeaders()
    res.end(output)
  }, _error_end)
}


function FastCGI(FastCGI_options, COMMON_options, isWorker=false) {
  const {
    dir='.',
    listen=9090,
    monitorListen=0,
    ...CGI_options
  }=FastCGI_options
  const {
    monitor=true,
    locally=true,
    silent=false,
  }=COMMON_options || {}
  const sharedGlobals={
    basedir: path.resolve(dir),
    Application: {},
    FastCGI_options,
    RUNTIME_MODE: isWorker? 'FPM': 'FastCGI',
  }
  start_server({
    listen,
    CGI_options,
    COMMON_options,
    sharedGlobals,
  })
  if(!isWorker) {
    !silent && log_server_info('[FastCGI]', listen, locally)
  }
  if(monitor) {
    start_server({
      listen: monitorListen,
      CGI_options: null,
      COMMON_options: Object.assign({}, COMMON_options, isWorker? {silent: true}: {}),
      sharedGlobals: {
        isMaster: false,
        workerData: {
          monitorPort: monitorListen,
        },
        basedir: __dirname+'/simple-template-server/monitors',
        Application: {},
        RUNTIME_MODE: isWorker? 'FPM': 'FastCGI',
      },
    })
    if(!isWorker) {
      !silent && log_server_info('[FastCGI Monitor]', monitorListen, locally)
    }
  }
}


function FPM(FPM_options, FastCGI_options, COMMON_options) {
  const {workers, listen: masterPort}=FPM_options
  loadBalance(workers, availablePort=>{
    FastCGI(
      Object.assign({}, FastCGI_options, {monitorListen: availablePort}),
      COMMON_options,
      true,
    )
  }, workersData=>{
    if(COMMON_options.monitor) {
      start_server({
        listen: masterPort,
        CGI_options: null,
        COMMON_options,
        sharedGlobals: {
          isMaster: true,
          masterData: {
            monitorPort: masterPort,
            workersData,
          },
          basedir: __dirname+'/simple-template-server/monitors',
          Application: {},
          RUNTIME_MODE: 'FPM',
        },
      })
      !COMMON_options.silent && log_server_info('[FPM Monitor]', masterPort, COMMON_options.locally)
    }
    !COMMON_options.silent && log_server_info('[FPM Workers]', FastCGI_options.listen, COMMON_options.locally)
  })
}


exports.server=(options)=>{
  const {
    common: COMMON_options={},
    fpm: FPM_options=null,
    ...FastCGI_options
  }=options
  startup({
    COMMON_options,
    FastCGI_options,
    FPM_options,
    isWorker: !require('cluster').isWorker,
  })
  if(!FPM_options) {
    FastCGI(FastCGI_options, COMMON_options)
  }else{
    FPM(FPM_options, FastCGI_options, COMMON_options)
  }
}

exports.runAsCLI=({
  entry,
  uri,
  host='localhost',
  schema='http:',
})=>{
  const {dir, base}=path.parse(entry)
  const CGI_options={
    exts: ['.cjs'],
    index: [base],
  }
  const COMMON_options={
    silent: false,
  }
  const sharedGlobals={
    basedir: dir,
    Application: {},
    FastCGI_options: {},
    RUNTIME_MODE: 'CLI',
  }
  const req={
    url: schema+'//'+host+uri,
    headers: {
      host,
    },
  }
  const res=Object.assign(process.stdout, {
    writeHead: (statusCode, headers)=>{
      console.log('-- statusCode:', statusCode, '--')
      console.log('-- response headers --')
      console.log(headers)
    },
    end: content=>{
      console.log('-- response content --')
      console.log(content)
    }
  })
  CGI(CGI_options, COMMON_options, sharedGlobals, req, res)
}