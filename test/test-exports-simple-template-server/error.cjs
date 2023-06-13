<?js
setDebugging(1)
if(pathname==='/favicon.ico') {
	setStatusCode(200)
	echo('this file does not exists')
	return
}
?><h1>It seems that something unexpected happened.</h1>
<?js
if(error) {
  echo(error.message)
}
