#!/usr/bin/env node

const {Command}=require('commander')
const program=new Command()
const path=require('path')
const fs=require('fs')

program
  .name('cjs')
  .description('A powerful preprocessing toolkit')
  .version(require(__dirname+'/package.json').version)

function cjs_macro() {
  program
    .command('macro')
    .description('Compiling source files according to macro definition rules.')
    .requiredOption('-d, --defines-file <string>', 'Definition rules file')
    .option('-e, --enable-spaces-indent', 'Enable spacing indent mode')
    .option('-t, --test-file <string>', 'Test file')
    .option('-i, --in-dir <string>', 'Source directory')
    .option('-o, --out-dir <string>', 'Output directory')
    .option('-m, --include-matches <string>', 'Include files, given as a pattern')
    .option('-x, --exclude-matches <string>', 'Exclude files, given as a pattern')
    .action(({definesFile, enableSpacesIndent, testFile, inDir, outDir, includeMatches, excludeMatches}) => {
      const {
        prehandleFileSync,
      }=require(__dirname+'/libs/engines/define')

      const predeclare={
        type: 'filename',
        str: definesFile,
      }

      if(testFile) {
        const result=prehandleFileSync(testFile, predeclare, {
          enableSpacesIndent,
        })
        console.log(result)
        return
      }

      const options={
        indir: inDir,
        outdir: outDir,
        includeRe: includeMatches? new RegExp(includeMatches): /\.(js|css|json|jsx|scss|less|md|html|htm|cjs|njs)$/,
        excludeRe: excludeMatches? new RegExp(excludeMatches): /^\.DS_/,
        predeclare,
        enableSpacesIndent,
      }
      const processorSync=require('./exports/macro-define-processor')
      processorSync(options)
      console.log('-- done --')
    })

}



function ini2input(p, activeSections, handle) {
  p.option('-c --config <string>', 'Specifiy the configuration file')
  const {INIParser, parseINIValue, filename2INIContext}=require(__dirname+'/libs/utils/base')
  const default_ini=__dirname+'/exports/simple-template-server/default.ini'
  const {comments, groups, ini, ctx}=INIParser({
    filename: default_ini,
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
        mockFileContent: fs.readFileSync(default_ini, 'utf8')+'\n\n'+fs.readFileSync(fn, 'utf8'),
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

    handle(x, p=>{
      const o=[]
      for(let k in x) {
        if(k.indexOf(p)>-1 && x[k]===true) {
          o.push(k.substr(p.length).toLowerCase())
        }
      }
      return o
    })

  })
}

function cjs_server() {
  const p=program
    .command('server')
    .description('Start a local server')

  ini2input(p, ['server', 'security'], (x, x2arr)=>{

    for(let v of ['extensions', 'entryIndex', 'entryForbidden']) {
      x[v]=x[v].split(',').map(a=>a.trim()).filter(a=>a)
    }
    const options={
      dir: x.directory,
      listen: x.port,
      exts: x.extensions,
      index: x.entryIndex,
      error: x.entryFallbackFilename && path.resolve(x.directory, x.entryFallbackFilename),
      forbidden: x.entryForbidden,
      walk: x.entryFallbackTraverse,
      debugging: x.debug,

      common: {
        locally: x.locally,
        silent: x.silent,
        passTimeout: x.cachePassTimeout*1e3,
        plugins: x2arr('pluginEnable'),
        security: x2arr('security'),
      },
    }

    if(x.fpmEnable) {
      options.fpm={
        workers: x.fpmWorkers,
      }
    }

    const {server}=require('./exports/simple-template-server')
    server(options)

  })

}

function cjs_cli() {
  const p=program
    .command('cli')
    .description('Execute a cjs file in command window')

  ini2input(p, ['cli', 'security'], (x, x2arr)=>{

    const options={
      entry: path.resolve(x.cliFile),
      uri: x.cliUri,
      host: x.cliHost,
      schema: x.cliSchema,
      plugins: x2arr('pluginEnable'),
      security: x2arr('security'),
    }

    const {runAsCLI}=require('./exports/simple-template-server')
    runAsCLI(options)

  })

}

cjs_macro()
cjs_server()
cjs_cli()

program.parse()
