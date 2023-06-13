<?js
function echo_tab_title(x, c='sub') {
	echo(`<tr class='title ${c}'><td colspan=2>${x}</td></tr>`)
}
function echo_tab_item(k, v, c='') {
	echo(`<tr class='item ${c}'><td class='left'>${k}</td><td class='right'>${v}</td></tr>`)
}
function echo_meta() {
	?>
<meta charset='utf8'>
<style type=text/css>
table{
	width: 100%;
}
td{
  word-break: break-all;
}
h3{
	line-height: 2;
	margin: 0;
}
tr.title{
	text-align: left;
}
.title.main td{
	font-size: 32px;
}
.title.sub td{
	font-size: 24px;
}
tr.title td{
	font-size: 16px;
  font-weight: bold;
  font-style: italic;
}
span.sup{
  background: #333;
  color: #fff;
  font-size: 12px;
  padding: 2px;
  margin: 2px;
}
td{
	position: relative;
}
.nseq{
  background: #ffc550;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}
tr{
	background: #eee;
}
tr:nth-child(2n+1) {
  background: #d7d7d7;
}
</style>

	<?js
}
function info() {
	echo_meta()
	echo('<table>')
	echo_tab_title('Template Engine informations', 'main')

	echo_tab_title('special variables')
	echo_tab_item('__dirname', __dirname)
	echo_tab_item('__filename', __filename)
	echo_tab_item('__filefullname', __filefullname)

	echo_tab_title('process.argv')
	for(let i=0; i<process.argv.length; i++) {
		echo_tab_item('process.argv['+i+']', process.argv[i])
	}

	echo_tab_title('global')
	for(let k in global) {
		const v=global[k]
		const typeV=typeof v
		const k1=`<div style="white-space: nowrap;">
		  <span class='sup'>${typeV}</span> ${k}
		</div>`
		let v1=''
		if(typeV==='function' || typeV==='string') {
			v1=`<pre>${v}</pre>`
		}else if(typeV==='object') {
			try{
				v1=`<pre>${JSON.stringify(v, 0, 2)}</pre>`
			}catch(e) {
				v1=`<div class='nseq'>Not sequencable</div>`
			}
		}
		echo_tab_item(k1, v1)
	}

	echo_tab_title('process.env')
	for(let k in process.env) {
		echo_tab_item(k, process.env[k])
	}

	echo('</table>')
}
exports({
	library_functions: {info},
	plugin: true,
})
