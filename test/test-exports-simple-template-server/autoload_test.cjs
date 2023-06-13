<?js

__autoload_libraries(libraryname=>{
  console.log('>>', libraryname)
  if(libraryname==='ALibrary') return __dirname+'/ALibrary.cjs'
})

o=ALibrary
console.log(o)
K=ALibrary
ALibrary.xx()
ALibrary.yy()


__autoload_classes(classname1=>{
  console.log(classname1)
  if(classname1==='AClass') return __dirname+'/AClass.cjs'
})

echo(22)

a=new AClass
a.test(11)

b=new AClass
b.test(22)

await include_file('./info.cjs')
