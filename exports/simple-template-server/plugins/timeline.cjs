<?js

function timeline_display({
	echart_path,
  query_info_path,
  title,
  result_display_keys,
  result_display_keys_selected,
}) {
	?>
<script src='<?js echo(echart_path) ?>'></script>
<div id="main" style="position: absolute; left: 0; top: 0;"></div>

<script type="text/javascript">
let myChart=echarts.init(main)
; (onresize=_=>{
  main.style.width=innerWidth+'px'
  main.style.height=innerHeight+'px'
  myChart.resize()
})()

function formatTimestamp(time) {
  const t=new Date
  t.setTime(time)
  return [t.getHours(),t.getMinutes(),t.getSeconds()].map(a=>{
    if(a<10) return '0'+a
    return a
  }).join(':')
}

let after=null, seq_maxlen=1, REC_FREQ=1
const getdata=_=>new Promise(done=>{
  const a=new XMLHttpRequest
  a.open('GET', '<?js echo(query_info_path) ?>?after='+(after===null? 1: after), 1)
  a.onreadystatechange=_=>{
    if(a.readyState<4) return
    try{
      let res=JSON.parse(a.responseText)
      after=(res.ls[res.ls.length-1]||{}).time||after
      REC_FREQ=res.REC_FREQ
      seq_maxlen=res.seq_maxlen
      done(res.ls)
    }catch(e) {
      done()
    }
  }
  a.send()
})
const sleep=t=>new Promise(r=>setTimeout(r, t))
const getopt=inited=>({
    title: {
        text: <?js echo(JSON.stringify(title)) ?>,
    },
    tooltip: {
        trigger: 'axis'
    },
    legend: Object.assign({
        data: <?js echo(JSON.stringify(result_display_keys)) ?>,
    }, inited? {}: {
        selected: <?js echo(JSON.stringify(result_display_keys.reduce((x, k)=>{
          x[k]=result_display_keys_selected.includes(k)
          return x
        }, {}))) ?>,
    }),
    grid: {
        left: '3%',
        right: '4%',
        bottom: '5%',
        top: '8%',
        containLabel: true
    },
    xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map(a=>formatTimestamp(a.time))
    },
    yAxis: {
        type: 'value'
    },
    series: [
      <?js for(let i=0; i<result_display_keys.length; i++) { ?>
        {
            name: '<?js echo(result_display_keys[i]) ?>',
            type: 'line',
            data: data.map(a=>a.data.<?js echo(result_display_keys[i]) ?>)
        },
      <?js } ?>
    ]
})

const data=[]
; (async _=>{
  for(let inited;;) {
    try{
      const ls=await getdata()
      data.push(...ls)
      while(data.length>seq_maxlen) data.shift()
      myChart.setOption(getopt(inited))
      inited=1
      await sleep(ls.length>2? 16: REC_FREQ*1e3)
    }catch(e) {
      await sleep(2e3)
    }
  }
})()

</script>
<?js
}

function timeline_get_after_value() {
	return +query.after
}

function timeline_build_result({seq_maxlen, frequence, records}) {
	return JSON.stringify({
		seq_maxlen,
    REC_FREQ: frequence,
    ls: records,
	})
}

exports({
	library_functions: {
		timeline_display,
		timeline_build_result,
		timeline_get_after_value,
	},
	plugin: true,
})
