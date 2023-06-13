#!/usr/bin/env node

const {Command}=require('commander')
const program=new Command()

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
      const {prehandleFileSync}=require('./libs/engines/define')
      const predeclare=require('fs').readFileSync(definesFile, 'utf8')

      if(testFile) {
        const result=prehandleFileSync(testFile, predeclare, enableSpacesIndent)
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

function cjs_server() {
  const p=program
    .command('server')
    .description('Start a local server')
    .option('-c --config <string>', 'Specifiy the configuration file')
  const {simpleINIParser, parseINIValue}=require(__dirname+'/libs/utils/base')
  const fs=require('fs')
  const default_ini=__dirname+'/cjs-server.ini'
  const ini=simpleINIParser(fs.readFileSync(default_ini, 'utf8'), default_ini, {}, (ini, x, keys, params)=>{
    if(x!==keys[keys.length-1]) return;
    p.option('--'+keys.join('-')+' <string>', params.comment, params.rawValue)
  })
  p.action(x=>{
    for(let v in x) {
      x[v]=parseINIValue(x[v])
    }

    const {server}=require('./exports/simple-template-server')
    const parse_multi_value=x=>x.split(',').map(a=>a.trim()).filter(a=>a)
    const path=require('path')

    if(x.config) {
      const fn=path.resolve(x.config)
      simpleINIParser(fs.readFileSync(fn, 'utf8'), fn, ini, (ini, cur, keys, params)=>{
        if(cur!==keys[keys.length-1]) return;
        const _key=keys.reduce((x, y, i)=>{
          if(i) {
            x+=y.charAt(0).toUpperCase()+y.substr(1)
          }else{
            x+=y
          }
          return x
        }, '')
        x[_key]=params.value
      })
    }


    const options={
      dir: x.directory,
      listen: x.port,
      monitorListen: x.managerPort,
      exts: parse_multi_value(x.extensions),
      index: parse_multi_value(x.entryIndex),
      error: x.entryError_absolute_path && path.resolve(x.directory, x.entryError_absolute_path),
      forbidden: parse_multi_value(x.entryForbidden),
      walk: x.entryEnable_walker,
      debugging: x.debug_mode,

      common: {
        monitor: x.managerEnable,
        locally: x.locally,
        silent: x.silent_mode,
      },
    }

    if(x.fpmEnable) {
      options.fpm={
        workers: x.fpmWorkers,
        listen: x.managerPort,
      }
    }

    if(!options.common.silent) {
      console.log('options:', options)
    }

    server(options)

  })
}

function cjs_cli() {
  const p=program
    .command('cli')
    .description('Execute a cjs file in command window')
    .requiredOption('-f --file <string>', 'The entry file')
    .option('-u --request-uri <string>', 'Specifiy a request uri for the entry file', '/')
    .option('-h --host <string>', 'Specifiy the server host for the entry file', 'localhost')
    .option('-s --schema <string>', 'Specifiy the schema for the entry file', 'http:')
  p.action(x=>{

    const {runAsCLI}=require('./exports/simple-template-server')
    const path=require('path')
    runAsCLI({
      entry: path.resolve(x.file),
      uri: x.uri,
      host: x.host,
      schema: x.schema,
    })

  })
}

cjs_macro()
cjs_server()
cjs_cli()

program.parse()
