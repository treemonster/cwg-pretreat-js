<?js


/**
 The Template Engine provided an simple sandbox to execute
 custom code for convenience. For some special situations,
 such as a production server, are still need preventing some
 dangerous behaviors.
 This plugin is used for executing the security policy.
 */

exports({
  library_functions: {},
  plugin: true,
})

// The security policy will be executed only once during startup.
if(Application.__SECURITY_POLICY_EXECUTED__) return;

Application.__SECURITY_POLICY_EXECUTED__=true

const prevents={}
function getPrevent(x, option) {
  if(prevents[x]) return prevents[x]
  const {isFunc, attr}=option
  if(isFunc) {
    prevents[x]=_=>{
      throw new Error(`The ${x} function has been disabled by the policy`)
    }
    return prevents[x]
  }
  prevents[x]=attr
  return prevents[x]
}

function traverseAttr(source, attr) {
  const target={}
  for(let x of attr.split(',')) {
    x=x.trim()
    if(!x) continue

    if(x==='*') return Object.freeze(source)

    for(let i=0, s=source, t=target, v=x.split('.'); i<v.length; i++) {
      const b=v[i].trim()
      if(!b) continue
      t[b]=t[b] || {}
      if(i===v.length-1) {
        t[b]=s[b]
      }else{
        t=t[b]
        s=s[b]
      }
    }
  }
  return Object.freeze(target)
}

const nodeGlobal=parseInt.constructor('return global')()
const nodeGlobalThis=parseInt.constructor('return this')()
const realGlobal=Function('return global')()
const realGlobalThis=Function('return this')()
const controllableGlobal=global
const currentContext=globalThis

function mapToAll(attr, value) {
  const _setval=a=>{
    const nextval=typeof value==='function'? value(a): value
    if(nextval===undefined) return;
    a[attr]=nextval
  }
  __SINGLETON__.contexts.map(ctx=>_setval(ctx))
  _setval(controllableGlobal)
  _setval(currentContext)
  _setval(realGlobal)
  _setval(realGlobalThis)
  _setval(nodeGlobal)
  _setval(nodeGlobalThis)
}



const resolvers={}
resolvers.EvalDisable=_=>{
  mapToAll('eval', _=>getPrevent('eval', {isFunc: true}))
}
resolvers.PolluteFunctionPrototype=_=>{
  const vm=require('vm')
  const v=new vm.Script(`
    func.constructor.prototype.constructor=(_=>{}).constructor
  `)
  const ctx={
    func: _=>{},
    eval: getPrevent('eval', {isFunc: true}),
    global: controllableGlobal,
  }
  v.runInNewContext(ctx)
  mapToAll('Function', _=>ctx.func.constructor.prototype.constructor)
  for(let k in nodeGlobal) delete nodeGlobal[k]
  for(let k in nodeGlobalThis) delete nodeGlobalThis[k]
  Object.assign(nodeGlobal, controllableGlobal, {global: controllableGlobal})
  Object.assign(nodeGlobalThis, controllableGlobal, {global: controllableGlobal})
  delete ctx.func
}
resolvers.ProcessEnableAttributes=attr=>{
  mapToAll('process', traverseAttr(process, attr))
}
resolvers.UtilsEnableAttributes=attr=>{
  mapToAll('utils', traverseAttr(utils, attr))
}


resolvers.RequireEnableModules=modules=>{
  const _modules=modules.split(',').map(a=>a.trim()).filter(a=>a)
  const _allow_list=[]
  for(let m of _modules) {
    if(m==='*') return;
    _allow_list.push(m)
  }

  const _is_whitelist=x=>{
    x+=''
    if(_allow_list.includes(x)) {
      return x
    }
  }

  const Module=require('module')
  const originalRequire=Module.prototype.require
  Module.prototype.require=function(x) {
    const {filename}=this
    const x1=_is_whitelist(x)
    if(x1) return originalRequire.call(this, x1)
    throw new Error('Failed to require the `'+x+'` module due to the security policy.')
  }

  const _grc=engineConfig.customOption.refers.getRequireCallable
  const _dgrc=filename=>{
    const _require=_grc(filename)
    const require=x=>{
      const x1=_is_whitelist(x)
      if(x1) return _require(x1)
      throw new Error('Failed to require the `'+x+'` module due to the security policy.')
    }
    for(let x in _require) require[x]=_require[x]
    return require
  }
  engineConfig.customOption.refers.getRequireCallable=_dgrc
  mapToAll('require', x=>{
    if(!x.require || !x.require.main) return
    return _dgrc(x.require.main.filename)
  })

}



const {securityPolicy}=engineConfig

for(let k in resolvers) {
  if(securityPolicy[k]) resolvers[k](securityPolicy[k])
}
