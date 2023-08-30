'use strict'

const {
  path,
  vm,
  module: _module,
}=require('../utils/api')

const utils=require('../utils/base')
const {defer, sleep, loadOrSetCache, getTimeRecorder, merge}=utils


let _t=0
const T_JS=_t++
const T_TEXT=_t++
function lexer(content, option) {
  const {
    FLAG_OPEN,
    FLAG_CLOSE,
  }=option.Tokens
  const tokens=[]
  const _t_flags=[]
  let c1=-1, c2=-1
  function _append_token(tk, left, right) {
    const tk_params=content.substr(left, right-left)
    if(!tk_params.length) return;
    tokens.push({tk, tk_params})
  }
  for(;;) {
    c1=content.indexOf(FLAG_OPEN, c1)
    c2=content.indexOf(FLAG_CLOSE, c2)
    if(c1===-1 && c1===-1) break
    if(c1>-1) {
      _t_flags.push({fk: FLAG_OPEN, idx: c1})
      c1+=FLAG_OPEN.length
    }
    if(c2>-1) {
      _t_flags.push({fk: FLAG_CLOSE, idx: c2})
      c2+=FLAG_CLOSE.length
    }
  }
  if(_t_flags.length) {
    const p=_t_flags[_t_flags.length-1]
    if(p.fk!==FLAG_CLOSE) _t_flags.push({
      fk: FLAG_CLOSE,
      idx: content.length,
    })
    for(let i=0; i<_t_flags.length; i+=2) {
      _append_token(T_TEXT, i>0? _t_flags[i-1].idx+FLAG_CLOSE.length: 0, _t_flags[i].idx)
      _append_token(T_JS, _t_flags[i].idx+FLAG_OPEN.length, _t_flags[i+1].idx)
    }
    _append_token(T_TEXT, _t_flags[_t_flags.length-1].idx+FLAG_CLOSE.length, content.length)
  }else{
    tokens.push({
      tk: T_TEXT,
      tk_params: content,
    })
  }
  return tokens
}
function transformToAst(tokens, filename, isSyncMode) {
  const __filefullname=path.resolve(filename)
  const {dir: __dirname, base: __filename}=path.parse(__filefullname)
  const hardCoded={
    __dirname,
    __filename,
    __filefullname,
  }
  let ret=''
  for(let i=0; i<tokens.length; i++) {
    if(tokens[i].tk===T_JS) {
      ret+=tokens[i].tk_params+'\n'
    }else if(tokens[i].tk===T_TEXT) {
      ret+='\necho('+JSON.stringify(tokens[i].tk_params)+');\n'
    }
  }
  const hardCodedStr=Object.keys(hardCoded).map(k=>`const ${k}=${JSON.stringify(hardCoded[k])};`).join('\n')
  const code=isSyncMode? `
  ; (_=>{
    ${hardCodedStr}
    ${ret}
  })()
  `:`
  ; (async _=>{
    ${hardCodedStr}
    ${ret}
  })()
  `

  return new vm.Script(code, filename)
}


/**
 This object should be a singleton in every instance.
 */
function getControllableGlobal() {
  return {

    // nodejs
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    queueMicrotask,
    clearImmediate,
    setImmediate,

    console,
    Buffer,
    process,

    TextDecoder,
    TextEncoder,
    URL,
    URLSearchParams,

    Promise,

    // v8
    JSON,
    RegExp,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Math,
    Set, WeakSet,
    Map, WeakMap,
    Proxy,
    Symbol,
    Error,
    Function,

    escape, unescape,
    encodeURI, decodeURI,
    encodeURIComponent, decodeURIComponent,
    isNaN, isFinite,
    parseInt, parseFloat,

  }
}


/**
 The __SINGLETON__ is a special type of variable.
 It provides some functions that can be shared across different contexts
 */
function getNewContext(option, filename, globals) {

  const {cache, controllableGlobal}=option

  if(!option.__SINGLETON__) {
    option.__SINGLETON__={

      contexts: [],

      // properties written in `interfaces` are shared during the request threading
      interfaces: {

        time_recorder: getTimeRecorder(),

        /**
         * @docs/functions
         * @desc
         * Appends multiple values to the output.
         * @params
         * `...any`: An array containing anything that can be serialized. Such as strings, numbers, Promises, etc.
         * @examples
         * echo(1, 'xx', Promise.resolve('yyy'))
         * */
        echo: (...argv)=>{
          __SINGLETON__.shared.output.push(...argv)
        },

        /**
         * @docs/functions
         * @desc
         * Specifies the autoload rules of undefined classes.
         * @params
         * `func`: A callback function which returns the filepath of the current classname.
         * @returns
         * File path string.
         * @examples
         * 
         * // X1.cjs
         * 
         * <?js
         * class X1{
         *   static log() {
         *     return 'X1 log'
         *   }
         * }
         * 
         * 
         * 
         * // index.cjs
         * 
         * <?js
         * 
         * __autoload_classes(classname=>{
         *   if(classname==='X1') return __dirname+'/X1.cjs'
         *   // you can write more mapping rules here
         * })
         * 
         * // Although the `X1` class is undefined in this context, it will be autoloaded here
         * // because we have specified the filename of this class in the `__autoload_classes` function.
         * // So we do not need to write some redundant codes to include the class file explicitly.
         * echo(X1.log())
         * 
         * 
         * // run index.cjs
         * 
         * cjs cli -f index.cjs
         * 
         * */
        __autoload_classes: func=>{
          __SINGLETON__.shared.modules.__autoload_classes_callback=func
        },


        /**
         * @docs/functions
         * @desc
         * Specifies the autoload rules of undefined libraries.
         * @params
         * `func`: A callback function which returns the filepath of the current library.
         * @returns
         * File path string.
         * @examples
         * 
         * // Y1.cjs
         * 
         * <?js
         * function log() {
         *   return 'Y1 log'
         * }
         * exports({
         *   library_functions: {
         *     log,
         *   }
         * })
         * 
         * 
         * 
         * // index.cjs
         * 
         * <?js
         * 
         * __autoload_libraries(libname=>{
         *   if(libname==='Y1') return __dirname+'/Y1.cjs'
         *   // you can write more mapping rules here
         * })
         * 
         * // Although the `Y1` class is undefined in this context, it will be autoloaded here
         * // because we have specified the filename of this library in the `__autoload_libraries` function.
         * // So we do not need to write some redundant codes to include the library file explicitly.
         * echo(Y1.log())
         * 
         * 
         * // run index.cjs
         * 
         * cjs cli -f index.cjs
         * 
         * */
        __autoload_libraries: func=>{
          __SINGLETON__.shared.modules.__autoload_libraries_callback=func
        },


        get_autoload_callbacks: _=>{
          return {
            __autoload_classes: __SINGLETON__.shared.modules.__autoload_classes_callback,
            __autoload_libraries: __SINGLETON__.shared.modules.__autoload_libraries_callback,
          }
        },

      },

      // shared properties do not need to display for users
      shared: {
        output: [''],

        // `modules` includes library functions and declared classes.
        // Their compilers will be called in sync mode, which is different from other executable files.
        // They should comply with the following rules:
        // 1. Their names must be unique.
        // 2. The global `await` symbol is not available due to the sync mode.
        // 3. You should via `__autoload_xx` functions to load them automatically instead of using `include_file` directly.
        modules: {
          __autoload_classes_callback: null,
          __autoload_libraries_callback: null,
          __autoload_classes_wrapper: (class_filename, content)=>{
            return content+'\n\nexports({library_class: '+path.parse(class_filename).name+'})'
          },
        },
      },

    }
  }
  const {__SINGLETON__}=option

  /**
   * @docs/functions
   * @desc
   * Exports variables.
   * @params
   * `obj`: A special object that is used to define the public interface of a module. Just like the `module.exports` object of Node.js.
   * @examples
   * 
   * 
   * // L1.cjs
   * <?js
   * exports({
   *   xx: 1,
   *   func: _=>{
   *     return 22
   *   }
   * })
   * 
   * // index.cjs
   * <?js
   * const v=await include_file(__dirname+'/L1.cjs')
   * console.log(v)
   * */
  const exports=obj=>{
    for(let k in obj) {
      if(ctx[k]) {
        throw new Error('exports `'+k+'` is duplicate in `'+filename+'`')
      }
      ctx[k]=obj[k]
    }
  }

  /**
   * @docs/functions
   * @desc
   * Import a cjs module from a specified path. It is an asynchronous function which returns a Promise. Just like the `import` function of Node.js.
   * @params
   * `inc_filename`: The cjs module path.
   * `private_datas`: Specifies extra global variables for the imported module.
   * @examples
   * 
   * // L1.cjs
   * <?js
   * function test() {
   *   return A1+A2 // Note: Both A1 and A2 are global variables which are provided by the caller.
   * }
   * exports({
   *   test,
   * })
   * 
   * // index.cjs
   * <?js
   * const v=await include_file(__dirname+'/L1.cjs', {A1: 11, A2: 22})
   * echo(v.test())
   * */
  const include_file=async (inc_filename, private_datas)=>{
    const _filename=path.resolve(filename+'/..', inc_filename)
    const {output, exports: _exports}=await prehandleFileAsync(
      option,
      {filename: _filename, wrapper: null, passTimeout: option.PASS_TIMEOUT},
      Object.assign({}, private_datas, globals),
      null,
    )
    return _exports
  }

  // `_include_file_sync` is not a public function
  // this function is only used for loading the files that can work in the follow situations
  // 1. only `library` and `class` exports can be loaded by this function
  // 2. the golbal scope `await` symbol is not available due to the sync mode
  const _include_file_sync=(inc_filename, private_datas, wrapper)=>{
    const _filename=path.resolve(filename+'/..', inc_filename)
    const {exports: _exports}=prehandleFileSync(
      option,
      {filename: _filename, wrapper, passTimeout: option.PASS_TIMEOUT},
      Object.assign({}, private_datas, globals),
      null,
    )
    return _exports
  }
  const include_library_sync=(libraryname, lib_filename, private_datas=null)=>{
    if(ctx[libraryname]) {
      throw new Error('`'+libraryname+'` already exists')
    }
    const lib_instance=_include_file_sync(lib_filename, private_datas, null)
    const {plugin, library_functions}=lib_instance
    if(!library_functions) {
      throw new Error('`'+lib_filename+'` did not export any public functions, please revise the fatal error by using `exports({library_functions: ...})` or do not use this file as a library')
    }
    library_functions.constructor.constructor.prototype.constructor=Function
    const {interfaces, shared}=__SINGLETON__
    if(plugin) {
      Object.assign(ctx, library_functions)
      Object.assign(interfaces, library_functions)
    }else{
      const lib1={
        [libraryname]: library_functions,
      }
      Object.assign(ctx, lib1)
      Object.assign(interfaces, lib1)
    }
    return library_functions
  }
  const include_class_sync=(classname, class_filename, just_include)=>{
    if(!just_include) {
      if(ctx[classname]) {
        throw new Error('`'+classname+'` already exists')
      }
    }
    const {interfaces, shared}=__SINGLETON__
    const class_instance=_include_file_sync(class_filename, null, shared.modules.__autoload_classes_wrapper)
    if(!just_include) {
      const class1={
        [classname]: class_instance.library_class
      }
      Object.assign(ctx, class1)
      Object.assign(interfaces, class1)
    }
    return class_instance.library_class
  }

  const ctx={
    exports,
    include_file,
    include_library_sync,
    include_class_sync,
    defer,
    sleep,
    utils,
  }
  Object.assign(ctx, {
    /**
     * @docs/functions
     * @define
     * require(module)
     * @desc
     * A function which has similar behaviors of `require` function in Node.js.
     * @params
     * `module`: The wanted module path.
     * */
    require: (_=>{
      try{
        return _module.createRequire(filename)
      }catch(e) {
        return require
      }
    })(),

    /**
     * @docs/functions
     * @desc
     * Execute specified code in current context.
     * @params
     * `code`: The code string.
     * @returns
     * The last value.
     * */
    eval: code=>{
      const e=new vm.Script(code)
      return e.runInNewContext(ctx)
    },
  })
  Object.assign(ctx, globals, __SINGLETON__.interfaces)
  Object.assign(ctx, controllableGlobal)
  ctx.globalThis=ctx
  ctx.global=controllableGlobal
  __SINGLETON__.contexts.push(ctx)
  return ctx
}

function executeVMSync(ctx, vm) {
  return vm.runInNewContext(ctx)
}
async function executeVM(ctx, vm, __SINGLETON__) {
  await executeVMSync(ctx, vm)
  if(!__SINGLETON__) return;
  const output=await Promise.all(__SINGLETON__.shared.output)
  return output.join('')
}

function getValue(...a) {
  for(let i=0; i<a.length; i++) {
    if(a[i]!==undefined) return a[i]
  }
}

function _prehandleFile(syncMode, option, {filename, mockFileContent, wrapper, passTimeout}, globals, emitters) {

  const {
    beforeExecuteSync, // change attribues of the context
  }=emitters || {}

  const [astvm, get_clean_exports]=loadOrSetCache(option.cache, {filename, mockFileContent, wrapper, passTimeout}, fileContent=>{
    const ctx=getNewContext(option, filename, {})
    let _filters=new Set(Object.keys(ctx))
    function get_clean_exports(ctx) {
      let _ctx={}
      for(let key in ctx) {
        if(_filters.has(key)) continue
        _ctx[key]=ctx[key]
      }
      return _ctx
    }
    const tokens=lexer(fileContent, option)
    const astvm=transformToAst(tokens, filename, syncMode)
    return [astvm, get_clean_exports]
  })
  let ctx=getNewContext(option, filename, globals)
  const {
    __SINGLETON__,
    controllableGlobal,
  }=option
  let pctx=new Proxy(ctx, {
    get: (target, prop, receiver)=>{
      const _old=getValue(target[prop], controllableGlobal[prop], __SINGLETON__.interfaces[prop])
      if(target!==ctx || _old!==undefined) return _old

      const {
        __autoload_classes_callback,
        __autoload_libraries_callback,
      }=__SINGLETON__.shared.modules

      let _filename=null

      _filename=__autoload_classes_callback && __autoload_classes_callback(prop)
      if(_filename) {
        return ctx.include_class_sync(prop, _filename)
      }

      _filename=__autoload_libraries_callback && __autoload_libraries_callback(prop)
      if(_filename) {
        return ctx.include_library_sync(prop, _filename)
      }

      return undefined
    }
  })
  if(beforeExecuteSync) {
    beforeExecuteSync(pctx, __SINGLETON__, option)
  }

  return {
    pctx,
    astvm,
    get_clean_exports,
    __SINGLETON__,
  }

}


async function prehandleFileAsync(...argv) {
  const {pctx, astvm, get_clean_exports, __SINGLETON__}=_prehandleFile(false, ...argv)
  const output=await executeVM(pctx, astvm, __SINGLETON__)
  return {
    output,
    exports: get_clean_exports(pctx),
  }
}


// This function is used for mounting libraries and classes
// It is not a public function that should not be used in custom code directly
function prehandleFileSync(...argv) {
  const {pctx, astvm, get_clean_exports}=_prehandleFile(true, ...argv)
  executeVMSync(pctx, astvm)
  return {
    exports: get_clean_exports(pctx),
  }
}

const defaultOption={
  tokens: {
    FLAG_OPEN: '<?js',
    FLAG_CLOSE: '?>',
  },
}
function getParser(customOption={}) {
  const option=merge(defaultOption, customOption)
  const cache={}
  const controllableGlobal=getControllableGlobal()
  const Tokens=option.tokens

  return (file, globals, emitters)=>{
    if(typeof file==='string') {
      file={filename: file}
    }
    const option={
      Tokens,
      cache,
      controllableGlobal,
      __SINGLETON__: null,
      PASS_TIMEOUT: file.passTimeout || -1,
    }
    return prehandleFileAsync(option, file, globals, emitters)
  }
}

module.exports={
  prehandleFileAsync: getParser(),
}
