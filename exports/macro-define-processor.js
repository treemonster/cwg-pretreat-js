
const {
  parsePredeclare,
  prehandleFileSync,
}=require(__dirname+'/../libs/engines/define')

const fs=require('fs')
const path=require('path')

function walkSync(dir, includeRe, excludeRe, fileHandler, passHandler) {
  const total_dirs=[dir]
  for(;total_dirs.length;) {
    const dir=total_dirs.pop()
    const ls=fs.readdirSync(dir)
    for(let i=0; i<ls.length; i++) {
      const filename=ls[i]
      if(!filename.match(includeRe) || filename.match(excludeRe)) continue
      const filefullname=path.resolve(dir+'/'+filename)
      try{
        const stat=fs.statSync(filefullname)
        if(stat.isDirectory()) {
          total_dirs.push(filefullname)
        }else if(stat.isFile()) {
          fileHandler && fileHandler(filefullname)
        }else{
          passHandler && passHandler(new Error('`'+filefullname+'` is neither a file nor a directory'), filefullname)
        }
      }catch(e) {
        passHandler && passHandler(new Error('failed to access `'+filefullname+'`\n'+e.stack), filefullname)
      }
    }
  }
}

function saveFileSync(filename, content) {
  const [basedir, ...subdirs]=path.resolve(filename+'/..').replace(/[\\\/]+/g, '/').split('/')
  subdirs.reduce((prefix, cur)=>{
    const nextdir=prefix+'/'+cur
    try{
      fs.mkdirSync(nextdir)
    }catch(e) {}
    return nextdir
  }, basedir)
  fs.writeFileSync(filename, content)
}

module.exports=options=>{
  const {
    indir,
    outdir,
    includeRe=/\.(js|css|json|jsx|scss|less|md|html|htm|cjs|njs)$/,
    excludeRe=/^\.DS_/,
    predeclare='',
    enableSpacesIndent=false,
  }=options

  const _indir=path.resolve(indir)
  const _outdir=path.resolve(outdir)

  function fileHandler(filefullname) {
    const predeclareCtx=parsePredeclare(predeclare)
    const output=prehandleFileSync(filefullname, predeclareCtx, enableSpacesIndent)
    saveFileSync(_outdir+'/'+filefullname.substr(_indir.length), output)
  }
  function passHandler(e, filefullname) {
    console.log(e, filefullname)
  }
  walkSync(indir, includeRe, excludeRe, fileHandler, passHandler)
}