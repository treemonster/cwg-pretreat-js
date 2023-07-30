<?js

function _format(x) {
  if(x+''===x) {
    x={url: x}
  }
  let {
    url,
    headers,
    timeout,
    method,
    postbody,
  }=x
  headers=headers || {}
  timeout=timeout || 5e3
  method=(method || 'GET').toUpperCase()
  postbody=postbody || null
  return {
    url,
    headers,
    timeout,
    method,
    postbody,
  }
}

function _init({timeout}) {
  const retDefer=defer()
  let state={
    req: null,
    res: null,
    _t: sleep(timeout),
  }
  state._t.then(_=>{
    retDefer.reject(new Error('requesting timeout'))
  })
  retDefer.promise.catch(_=>0).then(_=>{
    const {req, res, _t}=state
    _t.cancel()
    if(req) req.removeAllListeners()
    if(res) res.removeAllListeners()
    if(req.socket) {
      const _lastClean=x=>x && x.on('error', _=>x.removeAllListeners())
      _lastClean(req)
      _lastClean(res)
      req.socket.destroy()
    }
    state.req=null
    state.res=null
    state._t=null
    state=null
  })
  return [retDefer, state]
}

function curl(x) {
  const {
    url,
    headers,
    timeout,
    method,
    postbody,
  }=_format(x)
  const [retDefer, state]=_init({timeout})
  const http=engineConfig.Api[url.match(/^https/)? 'https': 'http']
  const req=http.request(url, {
    method,
    headers,
  }, async res=>{
    state.res=res
    try{
      retDefer.resolve({
        statusCode: res.statusCode,
        responseHeaders: res.headers,
        responseBody: await utils.readrs(res),
      })
    }catch(e) {
      retDefer.reject(e)
    }
  })
  state.req=req
  req.on('error', retDefer.reject)
  req.end(postbody)

  return retDefer.promise
}

exports({
  library_functions: {
    curl,
  },
  plugin: true,
})
