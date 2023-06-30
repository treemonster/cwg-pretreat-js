<?js
try{
console.log(await curl('https://baidu.com'))
}catch(e){
  echo(e.message)
}
