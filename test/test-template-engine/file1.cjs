<?js
function echo_text(ext) {
  echo(`
  ${__filename}
  ${__dirname}
  ${__filefullname}
  ${ext}\n`)
}
console.log(typeof _echo) // we have set `_echo` to a string in `index.cjs`, but `_echo` is `undefined` here because of the scope isolation
exports({echo_text})
try{
  exports({echo_text}) // exports same names from one file is forbidden
}catch(e) {
  console.log(e.message)
}
echo('file1.cjs loaded\n')
global.counter=global.counter || 0
echo('file1 has been loaded:', ++global.counter, '\n')
const {echo_text: echo_text_2}=await include_file('./dir2/file2.cjs')
exports({echo_text_2})