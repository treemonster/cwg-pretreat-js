
const path=require('path')
const fs=require('fs')
const {Command}=require('commander')

function configProgram({name, description, version}) {
  const program=new Command()
  program
    .name(name)
    .description(description)
    .version(version)
  return program
}

function configCommand(p, {command, description}) {
  return p
    .command(command)
    .description(description)
}

function ini2input(p, {defaultINI, activeSections, toArrayFields, filters}, handle) {
  p.option('-c --config <string>', 'Specifiy the configuration file')
  const {INIParser, parseINIValue, filename2INIContext}=require('./iniParser')
  const {comments, groups, ini, ctx}=INIParser({
    filename: defaultINI,
    activeSections,
    onValue: ({keychain, comment, rawValue})=>{
      let options={
        call: 'option',
        short: '',
      }

      if(+rawValue+''===rawValue) {
        options.xtype='<number>'
        options.defaultValue=+rawValue
      }else if(rawValue.match(/^(on|off|yes|no|true|false)$/i)){
        options.xtype='<boolean>'
        options.defaultValue=rawValue.match(/^(on|yes|true)$/i)? true: false
      }else{
        options.xtype='<string>'
        options.defaultValue=rawValue
      }

      const _comment=comment.replace(/<(?:(required)|(?:short:\s*(.+?))|(noargv))>\s+/g, (_, required, short, noargv)=>{
        if(required) options.call='requiredOption'
        if(short) options.short=short+' '
        if(noargv) options.xtype=''
        return ''
      })

      const arg=[options.short+'--'+keychain.join('-')+(options.xtype? ' '+options.xtype: ''), _comment]
      if(options.call==='option') arg.push(options.defaultValue)
      p[options.call](...arg)
    },
  })

  p.action(x=>{

    for(let v in x) {
      x[v]=parseINIValue(x[v], ctx).value
    }
    if(x.config) {
      const fn=path.resolve(x.config)
      INIParser({
        filename: fn,
        mockFileContent: fs.readFileSync(defaultINI, 'utf8')+'\n\n'+fs.readFileSync(fn, 'utf8'),
        activeSections,
        onValue: ({keychain, value})=>{
          const _key=keychain.reduce((x, y, i)=>{
            if(i) {
              x+=y.charAt(0).toUpperCase()+y.substr(1)
            }else{
              x+=y
            }
            return x
          }, '')
          if(p.getOptionValueSource(_key)==='default') x[_key]=value
        }
      })
    }

    if(toArrayFields) {
      for(let v of toArrayFields) {
        x[v]=x[v].split(',').map(a=>a.trim()).filter(a=>a)
      }
    }

    if(filters) {
      for(fk in filters) {
        const {asObject, ignoreCase, keepOriginal}=filters[fk]
        const o=asObject? {}: []
        for(let k in x) {
          if(k.indexOf(fk)===-1) continue
          const _v=x[k]
          if(!keepOriginal) delete x[k]
          if(_v===false) continue
          let k1=k.substr(fk.length)
          if(ignoreCase) k1=k1.toLowerCase()
          if(asObject) {
            o[k1]=_v
          }else{
            o.push(k1)
          }
        }
        x[fk]=o
      }
    }

    handle(x)

  })
}

module.exports={
  configProgram,
  configCommand,
  ini2input,
}
