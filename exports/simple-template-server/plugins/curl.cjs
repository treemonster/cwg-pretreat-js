<?js
function curl({
  url,
  headers,
  timeout,
  method,
  postbody,
}) {
  headers=headers || {}
  timeout=timeout || 5e3
  method=(method || 'GET').toUpperCase()
  postbody=postbody || null

  const ret=defer()
  const http=require(url.match(/^https/)? 'https': 'http')
  const q=http.request(url, {
    method,
    headers,
  }, x=>{
    utils.readrs(x).then(body=>{
      ret.resolve({
        statusCode: x.statusCode,
        responseHeaders: x.headers,
        responseBody: body,
      })
    }, ret.reject)
  }).end(postbody)

  q.on('error', ret.reject)

  const _t=sleep(timeout)
  _t.then(ret.reject)

  ret.promise.finally(_=>{
    q.destroy()
    _t.cancel()
  })

  return ret.promise
}

exports({
  library_functions: {
    curl,
  },
  plugin: true,
})
