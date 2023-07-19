
const fs=require('fs')
const path=require('path')

const T_COMMENT=';'
const T_QUOTE1='"'
const T_QUOTE2="'"
const T_VAR=Symbol()

function parseINIValue(rawValue, ctx) {
  if(['boolean', 'number'].includes(typeof rawValue)) {
    return {
      value: rawValue,
      comment: '',
    }
  }
  const tokens=[]
  const typeStack=[]
  for(let i=0; i<rawValue.length; i++) {
    const c=rawValue.charAt(i)
    const sv=typeStack[typeStack.length-1]
    if([T_QUOTE1, T_QUOTE2].includes(sv)) {
      if(c===sv) {
        typeStack.pop()
      }else{
        tokens.push({
          type: sv,
          value: c,
        })
      }
    }else{
      if(sv===T_COMMENT) {
        tokens.push({
          type: sv,
          value: c,
        })
      }else if(sv===undefined) {
        if([T_QUOTE1, T_QUOTE2, T_COMMENT].includes(c)) {
          typeStack.push(c)
        }else{
          tokens.push({
            type: T_VAR,
            value: c,
          })
        }
      }else{
        throw new Error('unexcepted char '+c)
      }
    }
  }
  // console.log(tokens)

  const parsed=tokens.reduce((s, x, i)=>{
    if(!i) return [x]
    if(tokens[i-1].type===x.type) {
      s[s.length-1].value+=x.value
    }else{
      s.push(x)
    }
    return s
  }, 0)

  if(parsed===0) {
    return {
      value: '',
      comment: '',
    }
  }

  const _rawValue=[]
  const result=parsed.reduce((o, x)=>{
    const value=x.value.trim()
    if(x.type===T_VAR) {
      _rawValue.push(value)
      if(ctx[value]) {
        o.values.push(ctx[value])
        return o
      }
      const maybe_flag=parsed.filter(a=>a.type!==T_COMMENT).length===1
      if(!maybe_flag) {
        o.values.push(value)
        return o
      }

      const lv=value.toLowerCase()
      if(['on','yes', 'true'].includes(lv)) {
        o.flag=true
      }else if(['off','no', 'false'].includes(lv)) {
        o.flag=false
      }else if(+value+''===value) {
        o.flag=+value
      }else{
        o.values.push(value)
      }
    }else if([T_QUOTE1, T_QUOTE2].includes(x.type)) {
      _rawValue.push(x.type+value+x.type)
      o.values.push(value)
    }else if(T_COMMENT===x.type) {
      o.comment=value
    }
    return o
  }, {
    values: [],
    flag: undefined,
    comment: '',
  })

  const {values, flag, comment}=result
  return {
    value: flag===undefined? values.join(''): flag,
    rawValue: _rawValue.join(' '),
    comment,
  }
}

function parseINILine(line, ctx) {
  const ret={
    name: '',
    key: '',
    value: '',
    comment: '',
  }
  line=line.trim()
  line.replace(/^(?:\[([^\]]+)\])?(?:\s*;\s*(.*)\s*)?$|^([^=]+?)\s*=(.*)$/g, (_, name, comment, key, value)=>{
    Object.assign(ret, {
      name, comment, key, value,
    })
  })
  return ret
}

function filename2INIContext(filename) {
  const filefullname=path.resolve(filename)
  return {
    __filename: filefullname,
    __dirname: path.parse(filefullname).dir,
  }
}

function INIParser(input) {
  const {
    filename,
    mockFileContent,
    activeSections=[],
    activeAllSections=false,
    onValue,
  }=input
  const inidata=mockFileContent || fs.readFileSync(filename, 'utf8')

  const ini={}
  const ctx=filename2INIContext(filename)
  const groups={}
  const comments={}

  const lines=inidata.split('\n')
  let cur_group=null, is_active_section=false, cur_section=''
  for(let i=0; i<lines.length; i++) {
    const ret=parseINILine(lines[i], ctx)
    if(ret.name) {
      const [section, ...group]=ret.name.split(':')
      is_active_section=activeAllSections || activeSections.includes(section)
      if(!is_active_section) continue
      groups[section]=groups[section] || {}
      cur_section=section
      const _group=group.join(':')
      groups[section][_group]=groups[section][_group] || {}
      cur_group=groups[section][_group]
    }else if(ret.key) {
      if(!is_active_section) continue
      const keychain=ret.key.split('.').filter(a=>a)
      const {rawValue, value, comment}=parseINIValue(ret.value, ctx)
      ctx[ret.key]=value
      if(comment) comments[ret.key]=comment

      keychain.reduce((o, x, i)=>{
        if(i===keychain.length-1) {
          onValue && onValue({
            input,
            keychain,
            value,
            rawValue,
            comment,
          })
          o[x]=value
          return o
        }else{
          o[x]=o[x] || {}
          return o[x]
        }
      }, ini)
      cur_group[keychain[0]]=ini[keychain[0]]

    }
    if(ret.comment) {
      comments[cur_section]=comments[cur_section] || []
      comments[cur_section].push(ret.comment)
    }
  }

  return {comments, groups, ini, ctx}
}

module.exports={
  INIParser,
  parseINIValue,
  filename2INIContext,
}

/*
console.log(INIParser({
  filename: '/home/yaf.ini',
  mockFileContent: `
    [yaf] ; yaf section
    ; xxx
    application.environ = "product" ; environ
    application.directory = __dirname "/.."
    application.dispatcher.default_route = /index/index/default
    application.modules =  "index, performance"
    application.bootstrap = application.directory "/bootstrap.cjs"

    [product:ssr]
    application.zz=12
    application.uuu= application.directory "/zmmzmx"

    [product:ssr_module]
    host = '127.0.0.1:23459'
    url = "http://" host "/index.html"

    [product]
    application.directory = __dirname "/../dist"
    application.FF= application.directory "/FFF"

    [ssr] ; this section will be ignored
    xx=1


  `,
  activeSections: ['yaf', 'product'],
  onValue: ({keychain, value, rawValue})=>{
    console.log(keychain, value, rawValue)
  },
}))
*/
