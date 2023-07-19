<?js

/**
 The Template Engine provided an unlimited sandbox to execute
 custom code for convenience. For some special situations, such
 as a production server, are still need preventing some dangerous
 behaviors.
 This plugin is used for executing the security policy.
 */

function getPrevented(x, isFunc) {
  if(isFunc) return _=>{
    throw new Error(`The ${x} function has been disabled by the policy`)
  }
  return new Error(`The ${x} object has been disabled by the policy`)
}

const _preventEval=getPrevented('eval', 1)
const _preventRequire=getPrevented('require', 1)
const _preventProcess=getPrevented('process', 0)
const _preventUtils=getPrevented('utils', 0)

const realGlobal=Function('return global')()
const realGlobalThis=Function('return this')()

const resolvers={}
resolvers.disableProcess=_=>{
  __SINGLETON__.contexts.map(ctx=>{
    ctx.process=_preventProcess
  })
  global.process=_preventProcess
  globalThis.process=_preventProcess
  realGlobal.process=_preventProcess
  realGlobalThis.process=_preventProcess
}
resolvers.disableEval=_=>{
  realGlobalThis.eval=_preventEval
}
resolvers.disableUtils=_=>{
  global.utils=_preventUtils
}
resolvers.disableRequire=_=>{
  __SINGLETON__.contexts.map(ctx=>{
    ctx.require=_preventProcess
  })
  global.require=_preventRequire
  globalThis.require=_preventRequire
  realGlobal.require=_preventRequire
  realGlobalThis.require=_preventRequire
}

resolvers.hookFunction=_=>{
  const vm=require('vm')
  const v=new vm.Script(`
    func.constructor.prototype.constructor=(_=>{}).constructor
  `)
  const ctx={
    func: _=>{},
    eval: _preventEval,
    global,
  }
  v.runInNewContext(ctx)
  realGlobal.Function=ctx.func.constructor.prototype.constructor
  realGlobalThis.Function=ctx.func.constructor.prototype.constructor
  global.Function=ctx.func.constructor.prototype.constructor
  delete ctx.func
}


if(!Application.__SECURITY_POLICY_EXECUTED__) {
  Application.__SECURITY_POLICY_EXECUTED__=true
  const {securityPolicy}=engineConfig
  for(let k in resolvers) {
    if(!securityPolicy.includes(k.toLowerCase())) continue
    resolvers[k]()
  }
}

exports({
  library_functions: {},
	plugin: true,
})
