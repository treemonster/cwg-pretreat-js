<meta charset=utf8 />
<pre>
<?js
echo(`RUNTIME_MODE is: ${RUNTIME_MODE} <br/>`)
echo(JSON.stringify(process.env, 0, 2))
console.log(global.CGI_options)
console.log(global.COMMON_options)
console.log(global.FastCGI_options)
// process.exit()
