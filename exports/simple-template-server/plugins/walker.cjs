<?js

const {os, fs, path, crypto}=engineConfig.Api

const IS_WIN32_OS=os.platform()==='win32'

function hsize(size) {
  const units=['b', 'kb', 'mb', 'gb']
  for(;size>=1024 && units.length>1;) {
    units.shift()
    size/=1024
  }
  return size.toFixed(1)+units[0]
}
function ltime(timestamp) {
	const v=new Date(timestamp)
	return v.toLocaleString()
}
function hexcolor(x) {
	return crypto.createHash('md5').update(x).digest('hex').substr(0, 6)
}
function format_path(x) {
  return path.normalize('/'+x).replace(/[\\\/]+/g, '/').replace(/\/+$/, '') || '/'
}
/*
console.log(format_path('/d:\\\\xx\\yy\\zz'))
console.log(format_path('d:\\\\xx\\yy\\zz\\'))
console.log(format_path('/zm'))
*/


let _t=0
const T_FORBIDDEN=_t++
const T_FILE=_t++
const T_DIRECTORY=_t++
function get_list(dir) {
  const real_dir=IS_WIN32_OS? dir.substr(1): dir
  const ls=fs.readdirSync(real_dir)
  return ls.filter(a=>!['.', '..'].includes(a)).map(fn=>{
    const absfile=path.resolve(real_dir+'/'+fn)
    try{
      const stat=fs.statSync(absfile)
      if(stat.isDirectory()) {
        return {
          fn,
          absfile: format_path(absfile),
          TYPE: T_DIRECTORY,
        }
      }else{
        const ext=path.parse(fn).ext || fn
        return {
          fn,
          absfile: format_path(absfile),
          fsize: hsize(stat.size),
          sext: ext.substr(1, 2),
          iconbg: hexcolor(ext),
          TYPE: T_FILE,
        }
      }
    }catch(e) {
      return {
        fn,
        absfile: format_path(absfile),
        TYPE: T_FORBIDDEN,
      }
    }
  })
}

/*
  console.log(parse_breadcrumb('d://x/y/z', true))
  console.log(parse_breadcrumb('d:/', true))
  console.log(parse_breadcrumb('d:', true))
  console.log(parse_breadcrumb('dd/x/y/z', true))
  console.log(parse_breadcrumb('x/y/z', false))
  return
 */
function parse_breadcrumb(relativedir) {
  let dir=format_path(relativedir || '/').split('/').filter(a=>a)
  return [{text: '', realpath: '/'}, ...dir.map((x, i)=>{
    return {
      text: x,
      realpath: format_path(dir.slice(0, i+1).join('/'))
    }
  })]
}


function walker_display(data) {
  const {
    breadcrumbs,
    dirs,
    files,
    unknowns,
  }=data
  ?><meta charset='utf8' />
<link rel="shortcut icon" href="#" type="image/x-icon">
<style type='text/css'>
a{
  color: #333;
  text-decoration: none;
}
a:hover{
  cursor: pointer;
  color: #3385ff;
  background: #ffe68f;
}
.opendir{
  display: block;
  font-size: 17px;
  line-height: 2;
  font-weight: bold;
}
.openfile{
  display: block;
  line-height: 2;
}
.fsize{
  font-size: 12px;
}
.icon{
  font-size: 12px;
  color: #fff;
  text-align: center;
  width: 25px;
  height: 30px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  line-height: 30px;
  transform: scale(.6);
  margin-right: 3px;
  border-radius: 9px 0 0 0;
}
</style>

<div class='breakcrumb'>
<?js

breadcrumbs.map(({text, realpath})=>{
  echo(`<a href="${realpath}">${text}/</a>`)
})
if(breadcrumbs.length>1) {
  echo(`<a href="${breadcrumbs[breadcrumbs.length-1].realpath+'/..'}">..</a>`)
}


function wrap_link(o) {
  return format_path(escape(pathname+'/'+o.fn))
}

?>
</div>

<hr />

<?js dirs.map(dir=>{ ?>
<a class='opendir' href='<?js echo(wrap_link(dir)) ?>'><?js echo(dir.fn) ?></a>
<?js }) ?>


<?js files.map(file=>{ ?>
<a class='openfile' href='<?js echo(wrap_link(file)) ?>'>
  <span class="icon" style="background-color: #<?js echo(file.iconbg) ?>"><?js echo(file.sext) ?></span>
  <span class='filelink'>
    <?js echo(file.fn) ?>
  </span>
  <span class='fsize'><?js echo(file.fsize) ?></span>
</a>
<?js }) ?>

<?js

}


function walker_parse({
  root,
  target,
  abs=false,
}) {

  root=format_path(root)
  target=format_path(target)

  if(!abs) {
    target=target.substr(1)
  }

  let absdir=abs? target: format_path(root+'/'+target)

  const ret={}

  const relativedir=absdir.substr(root.length)

  ret.breadcrumbs=parse_breadcrumb(relativedir)

  const list=get_list(absdir)

  ret.dirs=list.filter(a=>a.TYPE===T_DIRECTORY)
  ret.files=list.filter(a=>a.TYPE===T_FILE)
  ret.unknowns=list.filter(a=>a.TYPE===T_FORBIDDEN)

  return ret
}

exports({
  library_functions: {
    walker_parse,
    walker_display,
    walker_format_path: format_path,
  },
	plugin: true,
})

// header('render-cost', time_recorder.cost()+'ms')
