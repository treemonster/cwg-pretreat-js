<?js

/*
 This is a simple implementation of PHP-Yaf plugin for Node.js
 The plugin provides most of the functions and classes that are necessary for PHP-styled
 coding. Such as Yaf_Application, Yaf_Controller_Abstract, Yaf_Dispatcher, etc. You can
 now use them in the similar way as using them in writing php.
 Some of the PHP-Yaf features have not been achieved yet due to the following reasons:
 1. Node.js and PHP have different mechanisms, which makes it difficult to implement
    certain features in Node.js. Maybe I will try to implement them in the future.
 2. There are functions in PHP-Yaf that dynamically change configurations, such as
    setAppDirectory, addRoute, etc. However, using these functions can cause extra
    calculations. It is more practical to put the configuration rules in the ini file
    instead of using them at runtime.
 */

const fs=require('fs')
const path=require('path')

// cache the results which are computationally intensive and hardly change in the memory
Application.YAF_STORAGE=Application.YAF_STORAGE || {
  caches: {},
}

const {
  loadOrSetCache,
  INIParser,
}=utils


class Yaf_Application{
  #config=null;
  #dispatcher=null;
  static #_app=null;
  #_modules=null;
  #_running=null;
  #_environ=null;
  constructor(config, environ) {
    if(typeof config==='string') {
      const appconf=loadOrSetCache(
        Application.YAF_STORAGE.caches,
        {filename: config, wrapper: (x, str)=>{
          return loadOrSetCache(
            Application.YAF_STORAGE.caches,
            {filename: __dirname+'/yaf.default.ini'},
          )+'\n\n'+str
        }},
        inidata=>{
          const _routes=new Set
          const {ini, groups}=INIParser({
            filename: config,
            mockFileContent: inidata,
            activeSections: ['yaf', environ],
            onValue: ({input, keychain, rawValue})=>{
              if(!environ && keychain[0]==='application' && keychain[1]==='environ') {
                input.activeSections[1]=rawValue
              }
              if(keychain[0]==='routes') {
                _routes.add(keychain[1])
              }
            },
          })

          ini.application.modules=ini.application.modules.split(',').map(a=>a.trim()).filter(a=>a)

          ini.routes=[..._routes].reduce((o, x)=>{
            o.push(Object.assign({key: x}, ini.routes[x]))
            return o
          }, [])

          tolower(ini.application.modules)
          tolower(ini.application.dispatcher, [
           'default_module',
           'default_controller',
           'default_action',
           'default_route',
          ])

          if(ini.application.dispatcher.default_route) {
            ini.application.dispatcher.default_route=ini.application.dispatcher.default_route.split('/').filter(a=>a)
          }

          const {application}=ini
          if(!application.directory) {
            throw new Error('`application.directory` must be specified')
          }
          if(!application.environ) {
            throw new Error('`application.environ` must be specified')
          }
          return {ini, groups: groups[environ]}
        },
      )


      this.#config=appconf
      this.#_environ=appconf.ini.application.environ
      this.#_modules=appconf.ini.application.modules
      Yaf_Application.#_app=this
      this.#_running=this
      this.#dispatcher=new Yaf_Dispatcher(appconf)
    }else{
      // other configure methods are not supported yet
      throw new Error('please use ini file to config Yaf Application')
    }
  }
  static app() {
    return Yaf_Application.#_app
  }
  async bootstrap() {
    const Bootstrap=include_class_sync('Bootstrap', this.#config.ini.application.bootstrap)
    if(Object.getPrototypeOf(Bootstrap.prototype)!==Yaf_Bootstrap_Abstract.prototype) {
      throw new Error('The `Bootstrap` class must extend from the `Yaf_Bootstrap_Abstract` class.')
    }
    const inits=[]
    const b=new Bootstrap
    for(let k of Object.getOwnPropertyNames(Bootstrap.prototype)) {
      if(k.indexOf('_init')===0) {
        inits.push(b[k](this.#dispatcher))
      }
    }
    if(inits.length>0) {
      await Promise.all(inits)
    }
  }
  // clearLastError() {}
  environ() {
    return this.#_environ
  }
  /*
  async execute(pathname, query) {
    return await this.#dispatcher.dispatch({
      pathname,
      query,
    })
  }
  */
  getAppDirectory() {
    return this.#config.ini.application.directory
  }
  getConfig(group) {
    return group? this.#config.groups[group]: this.#config.ini
  }
  getDispatcher() {
    return this.#dispatcher
  }
  // getLastErrorMsg() {}
  // getLastErrorNo() {}
  getModules() {
    return this.#_modules
  }
  async run() {
    return await this.#dispatcher.dispatch()
  }
  // setAppDirectory(directory) {}
}

class Yaf_Dispatcher{
  #_router=null;
  #_view=null;
  #_request=null;
  // #_plugins=null;
  static #_instance=null;
  #_auto_render=false;
  #_return_response=true;
  #_instantly_flush=true;
  #_default_module=null;
  #_default_controller=null;
  #_default_action=null;
  #_catch_exception=0;
  #_throw_exception=1;
  #_disabledView=false;
  #_error_handler=null;
  #_forward_countdown=0;

  constructor(appconf) {
    const {application: yafConfig}=appconf.ini
    this.#_router=new Yaf_Router(appconf)
    this.#_view=new Yaf_View_Interface
    Yaf_Dispatcher.#_instance=this
    const {
      default_module,
      default_controller,
      default_action,
      catch_exception,
      throw_exception,
    }=yafConfig.dispatcher
    this.#_default_module=default_module
    this.#_default_controller=default_controller
    this.#_default_action=default_action
    this.#_catch_exception=catch_exception
    this.#_throw_exception=throw_exception
    this.#_forward_countdown=yafConfig.forward_limit
  }
  autoRender(flag) {
    this.#_auto_render=flag
  }
  catchException(flag) {
    this.#_catch_exception=flag? 1: 0
  }
  disableView() {
    this.#_disabledView=true
  }
  async dispatch(options) {
    try{
      const {
        pathname: _pathname=pathname,
        query: _query=query,
      }=options || {}
      this.#_request=new Yaf_Request_Abstract
      this.#_router.route(this.#_request, _pathname, _query)
      const {
        module,
        controller,
        action,
      }=this.#_router.getCurrentRoute()

      const p=await call_controller_action(module, controller, action, _query, this.#_disabledView)
      if(!p) {
        throw new Error('failed to goto route:'+JSON.stringify({
          module, controller, action,
        }))
      }

      const [v, ret]=p

      if(this.#_disabledView) {
        return
      }
      if(this.#_auto_render) {
        const output=await v.getView().render()
        if(this.#_instantly_flush) {
          echo(output)
        }
        if(this.#_return_response) {
          return ret || ''
        }
      }
    }catch(e) {
      console.log(e)
      this.catchingException(e)
    }
  }
  enableView() {
    this.#_disabledView=false
  }
  flushInstantly(flag) {
    this.#_instantly_flush=flag? 1: 0
  }
  getApplication() {
    return Yaf_Application.app()
  }
  getDefaultAction() {
    return this.#_default_action
  }
  getDefaultController() {
    return this.#_default_controller
  }
  getDefaultModule() {
    return this.#_default_module
  }
  static getInstance() {
    return Yaf_Dispatcher.#_instance
  }
  getRequest() {
    return this.#_request
  }
  getRouter() {
    return this.#_router
  }
  initView(templates_dir) {
    this.#_view.setScriptPath(templates_dir)
    return this.#_view
  }
  // registerPlugin() {}
  returnResponse(flag) {
    this.#_return_response=flag? 1: 0
  }
  setDefaultAction(action) {
    this.#_default_action=action
  }
  setDefaultController(controller) {
    this.#_default_controller=controller
  }
  setDefaultModule(module) {
    this.#_default_module=module
  }
  setErrorHandler(callback) {
    this.#_error_handler=callback
  }
  setRequest(_request) {
    this.#_request=_request
  }
  setView(view) {
    this.#_view=view
  }
  throwException(flag) {
    this.#_throw_exception=flag? 1: 0
  }
  catchingException(e) {
    const catchable=this.#_error_handler && this.#_catch_exception
    const throwable=this.#_throw_exception
    if(catchable) {
      this.#_error_handler(e)
    }else{
      if(throwable) {
        throw e
      }
    }
  }
  forwardCountdown() {
    if(!this.#_forward_countdown--) {
      throw new Error('Maximum forward times exceeded')
    }
  }
}








class Yaf_Controller_Abstract{
  // #actions=null;
  #_module=null;
  #_name=null;
  #_request=null;
  #_response=null;
  #_invoke_args={};
  #_view=null;
  #_calling_action=null;

  constructor(route_args, invoke_args) {
    const dispatcher=Yaf_Application.app().getDispatcher()
    Object.assign(this.#_invoke_args, invoke_args)
    this.#_request=dispatcher.getRequest()
    this.#_name=route_args.controller
    this.#_module=route_args.module
    this.#_calling_action=route_args.action
  }
  display(tpl, params) {
    echo(this.render(tpl, params))
  }
  async forward(...argv) {
    Yaf_Dispatcher.getInstance().forwardCountdown()
    let invoke_args=typeof argv[argv.length-1]==='string'? {}: argv.pop()
    let call_argv=[
      ...([this.#_module, this.#_name].slice(0, 3-argv.length)),
      ...argv,
      invoke_args,
      true,
    ]
    const p=await call_controller_action_only(...call_argv)
    if(!p) {
      throw new Error('failed to forward: '+JSON.stringify({
        module: call_argv[0],
        controller: call_argv[1],
        action: call_argv[2],
        invoke_args,
      }))
    }
    return p[1]
  }
  getInvokeArg(name) {
    return this.getInvokeArgs()[name]
  }
  getInvokeArgs() {
    return this.#_invoke_args
  }
  getModuleName() {
    return this.#_module
  }
  getName() {
    return this.#_name // end_cut(this.constructor.name, 'Controller')
  }
  getRequest() {
    return this.#_request
  }
  getResponse() {
    return this.#_response
  }
  getView() {
    return this.#_view
  }
  getViewPath() {
    return this.getView().getScriptPath()
  }
  async init() {
    // pass
  }
  initView() {
    const yafConfig=Yaf_Application.app().getConfig().application
    const dispatcher=Yaf_Dispatcher.getInstance()
    let _path=yafConfig.directory+'/'
    if(this.#_module!=='index') _path+='modules/'+this.#_module+'/'
    _path+=('views/'+this.#_name+'/'+this.#_calling_action).toLowerCase()
    this.#_view=Yaf_Application.app().getDispatcher().initView(_path)
  }
  redirect(url) {
    setStatusCode(302)
    header('location', url)
  }
  async render(tpl, params) {
    return this.getView().render(tpl, params)
  }
  setViewPath(view_directory) {
    this.getView().setScriptPath(view_directory)
  }

}





class Yaf_Router{
  #_routes=[];
  #_current=null;

  constructor(appconf) {
    this.#_routes=appconf.ini.routes
  }
  // addConfig() {}
  // addRoute(name, route) {}
  getCurrentRoute() {
    return this.#_current
  }
  _parseRoute(pathname, query) {
    // limit the maximum path length to ensure safety
    pathname=pathname.slice(0, 100)
    const app=Yaf_Application.app().getConfig().application
    const route={
      module: app.dispatcher.default_module,
      controller: app.dispatcher.default_controller,
      action: app.dispatcher.default_action,
    }
    const yaf_request=Yaf_Dispatcher.getInstance().getRequest()
    let route_matched=false
    for(let i=0; i<this.#_routes.length; i++) {
      const {type, ...argv}=this.#_routes[i]
      if(type==='simple') {
        route.module=query[argv.module] || route.module
        route.controller=query[argv.controller] || route.controller
        route.action=query[argv.action] || route.action
        route_matched=true
        break
      }else if(type==='regex') {
        const {match, route: _route, map}=argv
        const matched=pathname.match(new RegExp(match))
        if(!matched) continue
        for(let i in map) {
          yaf_request.setParam(map[i], matched[i])
        }
        Object.assign(route, _route)
        route_matched=true
        break
      }else if(type==='rewrite') {
        const _query={}
        let _match=true
        const {match, route: _route}=argv
        const _ms=match.split('/')
        const _ps=pathname.split('/')
        if(_ms.length>_ps.length) continue
        for(let j=0; j<_ms.length; j++) {
          if(_ms[j].indexOf(':')!==0) {
            if(_ms[j]!==_ps[j]) {
              _match=false
              break
            }else{
              continue
            }
          }
          if(!_match) break
          _query[_ms[j].substr(1)]=_ps[j]
        }
        if(!_match) continue
        Object.assign(route, _route)
        yaf_request.setParams(_query)
        route_matched=true
        break
      }
    }
    if(!route_matched) {
      const _ps=pathname.split('/').filter(a=>a)
      if(_ps.length===1) {
        route.controller=_ps[0]
      }else if(_ps.length===2) {
        route.controller=_ps[0]
        route.action=_ps[1]
      }else if(_ps.length>2) {
        route.module=_ps[0]
        route.controller=_ps[1]
        route.action=_ps[2]
      }
    }
    return tolower(route, ['module', 'controller', 'action'])
  }
  getRoute(name) {
    return this.#_routes.find(a=>a.key===name)
  }
  getRoutes() {
    return this.#_routes
  }
  route(yaf_request, _pathname, _query) {
    _pathname=_pathname || pathname
    _query=_query || query
    yaf_request.setBaseUri(_pathname)
    yaf_request.setRequestUri(url)
    this.#_current=this._parseRoute(_pathname, _query)
    yaf_request.setModuleName(this.#_current.module)
    yaf_request.setControllerName(this.#_current.controller)
    yaf_request.setActionName(this.#_current.action)
    yaf_request.setRouted(true)
  }
}

class Yaf_Request_Abstract{
  #module=null;
  #controller=null;
  #action=null;
  #method=null;
  #params={};
  #language=null;
  // #_exception=null;
  #_base_uri=null;
  #uri=null;
  #dispatched=false;
  #routed=false;

  constructor() {
    this.#language=headers['accept-language'] || ''
    this.setParams(query)
    this.#method=method
  }

  clearParams() {
    this.#params={}
  }
  getActionName() {
    return this.#action
  }
  getBaseUri() {
    return this.#_base_uri
  }
  getControllerName() {
    return this.#controller
  }
  getEnv(name, defaultValue) {
    return process.env[name] || defaultValue
  }
  // getException() {}
  getLanguage() {
    return this.#language
  }
  getMethod() {
    return this.#method
  }
  getModuleName() {
    return this.#module
  }
  getParam(name, defaultValue) {
    return this.getParams()[name] || defaultValue
  }
  getParams() {
    return this.#params
  }
  getRequestUri() {
    return this.#uri
  }
  // getServer() {}
  isCli() {
    return RUNTIME_MODE==='CLI'
  }
  isDispatched() {
    return this.#dispatched
  }
  isGet() {
    return this.#method==='GET'
  }
  isHead() {
    return this.#method==='HEAD'
  }
  isOptions() {
    return this.#method==='OPTIONS'
  }
  isPost() {
    return this.#method==='POST'
  }
  isPut() {
    return this.#method==='PUT'
  }
  isRouted() {
    return this.#routed
  }
  isXmlHttpRequest() {
    return headers['x-requested-with']==='XMLHttpRequest'
  }
  setActionName(action) {
    this.#action=action
  }
  setBaseUri(uri) {
    this.#_base_uri=uri
  }
  setControllerName(controller) {
    this.#controller=controller
  }
  setDispatched(flag) {
    this.#dispatched=flag
  }
  setModuleName(_module) {
    this.#module=_module
  }
  setParam(name, value) {
    this.setParams({[name]: value})
  }
  setParams(o) {
    Object.assign(this.#params, o)
  }
  setRequestUri(uri) {
    this.#uri=uri
  }
  setRouted(flag) {
    this.#routed=flag
  }

}


class Yaf_View_Interface{
  #_script_path=null;
  #_assigned_data={};

  assign(data) {
    Object.assign(this.#_assigned_data, data)
  }
  display(tpl='index'+Yaf_Application.app().getConfig().application.view.ext, tpl_vars) {
    include_file(path.resolve(this.getScriptPath(), tpl), Object.assign({}, this.#_assigned_data, tpl_vars))
  }
  getScriptPath() {
    return this.#_script_path
  }
  async render(...argv) {
    ob_open()
    this.display(...argv)
    ob_close()
    return ob_get_string()
  }
  setScriptPath(template_dir) {
    this.#_script_path=template_dir
  }
}

class Yaf_Bootstrap_Abstract{
  // you can write code like this:
  // then they will be called at the begining
  // async _initXX(dispatcher) {...}
}


exports({
  library_functions: {
    Yaf_Application,
    Yaf_Dispatcher,
    Yaf_Router,
    Yaf_View_Interface,
    Yaf_Request_Abstract,
    Yaf_Bootstrap_Abstract,
    Yaf_Controller_Abstract,
  },
  plugin: true,
})





/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////


function tolower(o, keys) {
  if(keys) {
    keys.map(a=>{
      if(o[a]) o[a]=o[a].toLowerCase()
    })
  }else{
    o.map((_, a)=>{
      o[a]=o[a].toLowerCase()
    })
  }
  return o
}

function insensitive_equal(a, b) {
  return a.toLowerCase()===b.toLowerCase()
}

function is_end_with(x, v) {
  return x.substr(x.length-v.length)===v
}

function end_cut(x, v) {
  return x.substr(0, x.length-v.length)
}


function existsFileSync(x) {
  try{
    return fs.statSync(x).isFile()
  }catch(e) {}
}


async function _call_controller_action(module, controller, action, invoke_args, _disabledView) {
  const yafConfig=Yaf_Application.app().getConfig().application
  module=yafConfig.modules.find(a=>a.toLowerCase()===module.toLowerCase())
  if(!module) return;
  const controller_classname=(module+yafConfig.name_separator+controller).toLowerCase()+yafConfig.name_suffix
  const controller_class_filename=get_autoload_callbacks().__autoload_classes(controller_classname)
  if(!existsFileSync(controller_class_filename)) return;
  const controller_class=include_class_sync(controller_classname, controller_class_filename, true)

  module=module.toLowerCase()
  controller=controller.toLowerCase()
  action=action.toLowerCase()

  const v=new controller_class({module, controller, action}, invoke_args)
  await v.init()
  if(!_disabledView) {
    v.initView()
  }
  for(let c of Object.getOwnPropertyNames(controller_class.prototype)) {
    if(c.toLowerCase()===action+'action') {
      return [v, await v[c]()]
    }
  }
}
async function call_controller_action_only(...argv) {
  return await _call_controller_action(...argv)
}
async function call_controller_action(...argv) {
  const p=await call_controller_action_only(...argv)
  if(p) return p
  const call_argv=Yaf_Application.app().getConfig().application.dispatcher.default_route
  if(!call_argv) return;
  for(;call_argv.length<3;) call_argv.push('index')
  return await _call_controller_action(...call_argv, ...argv.slice(3))
}
