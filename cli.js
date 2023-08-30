#!/usr/bin/env node


const path=require('path')
const fs=require('fs')

const {
  configProgram,
  configCommand,
  ini2input,
}=require(__dirname+'/libs/utils/base')

const program=configProgram({
  name: 'cjs',
  description: 'A powerful preprocessing toolkit',
  version: require(__dirname+'/package.json').version,
})

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

function _ini2input(program, {activeSections, toArrayFields, filters}, handle) {
  return ini2input(program, {
    defaultINI: __dirname+'/exports/simple-template-server/default.ini',
    activeSections,
    toArrayFields,
    filters,
  }, handle)
}

function cjs_server() {
  const p=configCommand(program, {
    command: 'server',
    description: 'Start a local server',
  })

  _ini2input(p, {
    activeSections: ['server', 'security', 'logger'],
    toArrayFields: ['extensions', 'entryIndex', 'entryForbidden'],
    filters: {
      pluginEnable: {ignoreCase: 1},
      security: {asObject: 1},
      logger: {asObject: 1},
    },
  }, x=>{

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
        plugins: x.pluginEnable,
        security: x.security,
        logger: x.logger,
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

  const p=configCommand(program, {
    command: 'cli',
    description: 'Execute a cjs file in command window',
  })

  _ini2input(p, {
    activeSections: ['cli', 'security'],
    filters: {
      pluginEnable: {ignoreCase: 1},
      security: {asObject: 1},
    },
  }, x=>{

    const options={
      entry: path.resolve(x.cliFile),
      uri: x.cliUri,
      host: x.cliHost,
      schema: x.cliSchema,
      plugins: x.pluginEnable,
      security: x.security,
    }

    const {runAsCLI}=require('./exports/simple-template-server')
    runAsCLI(options)

  })

}

cjs_macro()
cjs_server()
cjs_cli()

program.parse()
