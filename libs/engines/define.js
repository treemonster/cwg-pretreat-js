const path=require('path')
const vm=require('vm')
const {loadOrSetCache, merge}=require('../utils/base')


function lexer(content, option) {
  const {
    enableSpacesIndent,
    tokens: Tokens,
  }=option
  const {
    T_IFDEF,
    T_ELSE,
    T_ENDIF,
    T_IFNDEF,

    T_DEF,
    T_UNDEF,

    T_INCLUDE,

    T_DEFINE,
    T_CALL_DEFINE,
  }=Tokens

  const tokens=[]
  const lines=content.split('\n')
  let reStr='((?:'+[
    T_IFDEF, 
    T_ELSE, 
    T_ENDIF, 
    T_IFNDEF, 
    T_DEF, 
    T_UNDEF, 
    T_INCLUDE,
    T_DEFINE,
  ].join('|')+')\\b)((?:\\s+).+)?|(.+)'
  const re=new RegExp((enableSpacesIndent? '^\\s*': '^')+reStr, 'g')
  const subre=new RegExp(T_CALL_DEFINE+'([A-Za-z\\d_]+)(\\([^)]*?\\)|\\b)|(.)', 'g')

  for(let i=0; i<lines.length; i++) {
    if(!lines[i]) {
      tokens.push({frags: true, str: '\n'})
      continue
    }
    lines[i].replace(re, (_, tk, tk_params, subline)=>{
      if(tk) {
        tokens.push({tk, tk_params: (tk_params || '').trim()})
      }else if(subline) {
        subline.replace(subre, (_, call_define, call_define_params, frags)=>{
          if(call_define) {
            tokens.push({call_define, call_define_params})
          }else if(frags) {
            tokens.push({frags: true, str: frags})
          }
        })
        tokens.push({frags: true, str: '\n'})
      }
    })
  }
  const v=tokens.pop()
  if(!(v.frags===true && v.str==='\n')) {
    tokens.push(v)
  }
  return tokens
}

let _o=0
const O_IFDEF=++_o
const O_STR=++_o
const O_DEFINE_CONST=++_o
const O_DEFINE_CALL=++_o
const O_CALL_CONST=++_o
const O_CALL_DEFINE=++_o
const O_DEF=++_o
const O_INCLUDE=++_o
const O_UNDEF=++_o

function transformToAst(tokens, option) {

  const {
    tokens: Tokens,
  }=option
  const {
    T_IFDEF,
    T_ELSE,
    T_ENDIF,
    T_IFNDEF,

    T_DEF,
    T_UNDEF,

    T_INCLUDE,

    T_DEFINE,
    T_CALL_DEFINE,
  }=Tokens

  const tree=[]
  const if_stacks=[]
  function _get_if_stack() {
    if(!if_stacks.length) return;
    const p=if_stacks[if_stacks.length-1]
    const {_push_consequent, _reverse, consequent, alternate}=p
    let cd=[consequent, alternate]
    if(_reverse) cd.reverse()
    return cd[_push_consequent? 0: 1] // .push(if_statement)
  }

  for(let i=0; i<tokens.length; i++) {
    const x=tokens[i]
    if(x.tk===T_IFDEF || x.tk===T_IFNDEF) {
      const if_statement={
        type: O_IFDEF,
        match: x.tk_params,
        consequent: [],
        alternate: [],
        _push_consequent: true,
        _reverse: x.tk===T_IFNDEF,
      }
      const _cur_if_stack=_get_if_stack()
      _cur_if_stack && _cur_if_stack.push(if_statement)
      if_stacks.push(if_statement)
    }else if(x.tk===T_ELSE) {
      const t=if_stacks[if_stacks.length-1]
      if(!t || t.type!==O_IFDEF) throw new Error('not match '+T_ELSE)
      t._push_consequent=false
    }else if(x.tk===T_ENDIF) {
      const t=if_stacks[if_stacks.length-1]
      if(!t || t.type!==O_IFDEF) throw new Error('not match '+T_ENDIF)
      const p=if_stacks.pop()
      if(!if_stacks.length) {
        tree.push(p)
      }
    }else{
      let d={}
      if(x.tk===T_DEF) {
        Object.assign(d, {
          type: O_DEF,
          def: x.tk_params,
        })
      }else if(x.tk===T_UNDEF) {
        Object.assign(d, {
          type: O_UNDEF,
          def: x.tk_params,
        })
      }else if(x.tk===T_INCLUDE) {
        Object.assign(d, {
          type: O_INCLUDE,
          include: x.tk_params,
        })
      }else if(x.tk===T_DEFINE) {
        const re_define_func=/^([A-Za-z\d_]+)\(([^)]+)\)\s+(.+)/
        const re_define_const=/^([A-Za-z\d_]+)\s+(.+)/
        const matched_func=x.tk_params.match(re_define_func)
        const matched_const=x.tk_params.match(re_define_const)
        if(matched_func) {
          const [, funcname, argv, func_body]=matched_func
          Object.assign(d, {
            type: O_DEFINE_CALL,
            fname: funcname,
            fcall: new vm.Script(`(${argv})=>(${func_body})`).runInNewContext({require}),
          })
        }else if(matched_const) {
          const [, constant, value]=matched_const
          Object.assign(d, {
            type: O_DEFINE_CONST,
            cname: constant,
            cvalue: value+'',
          })
        }else{
          throw new Error('unsupported token: '+JSON.stringify(x))
        }
      }else if(x.call_define) {
        if(x.call_define_params) {
          const argv=x.call_define_params.substr(1, x.call_define_params.length-2).split(',').map(a=>a.trim())
          Object.assign(d, {
            type: O_CALL_DEFINE,
            call: x.call_define,
            argv,
          })
        }else{
          Object.assign(d, {
            type: O_CALL_CONST,
            call: x.call_define,
          })
        }
      }else if(x.frags) {
        Object.assign(d, {
          type: O_STR,
          str: x.str,
        })
      }else{
        throw new Error('unsupported token: '+JSON.stringify(x))
      }
      const ad=_get_if_stack() || tree
      const _f=ad[ad.length-1]
      if(d.type===O_STR && _f && _f.type===O_STR) {
        _f.str+=d.str
      }else{
        ad.push(d)
      }
    }
  }
  return tree
}

function newContext({option, caches, filename, parent}) {
  const ctx=Object.assign({}, parent || {
    defs: new Set,
    defines: {},
    filename: filename || '',
    option,
    caches,
  })
  if(filename) {
    ctx.filename=filename
  }
  return ctx
}


function execute(ctx, ast) {
  let ret=''
  for(let i=0; i<ast.length; i++) {
    const p=ast[i]
    if(p.type===O_IFDEF) {
      const {match, consequent, alternate}=p
      const sub_tree=ctx.defs.has(match)? consequent: alternate
      ret+=execute(ctx, sub_tree)
    }else if(p.type===O_STR) {
      ret+=p.str
    }else if(p.type===O_DEFINE_CONST) {
      ctx.defines[p.cname]=p.cvalue
    }else if(p.type===O_DEFINE_CALL) {
      ctx.defines[p.fname]=p.fcall
    }else if(p.type===O_CALL_CONST) {
      ret+=ctx.defines[p.call]
    }else if(p.type===O_CALL_DEFINE) {
      if(ctx.defines[p.call]) {
        ret+=ctx.defines[p.call](...p.argv)
      }else{
        throw new Error('undefined macro function: '+p.call)
      }
    }else if(p.type===O_DEF) {
      ctx.defs.add(p.def)
    }else if(p.type===O_UNDEF) {
      ctx.defs.delete(p.def)
    }else if(p.type===O_INCLUDE) {
      const filename=path.resolve(ctx.filename+'/..', p.include)
      const nctx=newContext({filename, parent: ctx})
      ret+=executeContext(nctx)
    }else{
      throw new Error('unsupported node: '+JSON.stringify(p))
    }
  }
  return ret
}
function executeContent(ctx, content) {
  const tokens=lexer(content, ctx.option)
  const ast=transformToAst(tokens, ctx.option)
  return execute(ctx, ast)
}
function executeContext(ctx) {
  const {caches, filename}=ctx
  return loadOrSetCache(caches, {filename}, fileContent=>{
    return executeContent(ctx, fileContent)
  })
}


const defaultOption={
  tokens: {
    T_IFDEF: '#ifdef',
    T_ELSE: '#else',
    T_ENDIF: '#endif',
    T_IFNDEF: '#ifndef',

    T_DEF: '#def',
    T_UNDEF: '#undef',

    T_INCLUDE: '#include',

    T_DEFINE: '#define',
    T_CALL_DEFINE: '@',
  },
  enableSpacesIndent: false,
}

function getParser(customOption) {
  const caches={}
  const option=merge(defaultOption, customOption)
  return (entryFilename, predeclare)=>{
    const ctx=newContext({
      filename: entryFilename,
      option,
      caches,
    })
    if(predeclare) {
      if(predeclare+''===predeclare) {
        predeclare={
          type: 'content',
          str: predeclare,
        }
      }
      const {type, str}=predeclare
      if(type==='content') {
        executeContent(ctx, str)
      }else if(type==='filename') {
        const pctx=newContext({filename: str, parent: ctx})
        executeContext(pctx)
      }else{
        throw new Error('unexcepted type of predeclare: '+type)
      }
    }
    return executeContext(ctx)
  }
}

module.exports={
  prehandleFileSync: (filename, predeclare, option)=>{
    const parse=getParser(option)
    return parse(filename, predeclare)
  },
}
