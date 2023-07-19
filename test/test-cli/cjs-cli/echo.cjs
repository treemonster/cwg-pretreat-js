Good <?js
const t=(new Date).getHours()
if(t<12) echo('morning')
else if(t<18) echo('afternoon')
else echo('evening')

ob_open()
echo(11)
echo(18181)
await include_file('./zz.cjs')
echo(22)
ob_close()
echo(182)
echo('<', ob_get_string(), '>')
