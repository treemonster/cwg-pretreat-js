11<?js echo(Date.now())

const v=include_file('./2.cjs')
echo(sleep(50).then(_=>888))
console.log((await v).LL)

echo('999')
