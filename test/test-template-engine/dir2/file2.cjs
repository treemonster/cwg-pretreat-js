<?js
function echo_text() {
	echo(`this is echo_text function defined in ${__filename}\n`)
}
exports({echo_text})
echo(">>> file2.cjs loaded\n")