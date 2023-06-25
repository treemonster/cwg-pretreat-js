<?js

function timeline_display({
	echart_path,
  query_info_path,
  extra_params,
  title,
  result_display_keys,
  result_display_keys_selected,
  options,
}) {
	?>
<style>
body{
  margin: 0;
}
.chartpanel{
  position: relative;
  left: 0;
  top: 0;
}
.chartpanel:nth-child(2n-1) {
  background: #eee;
}
</style>
<script src='<?js echo(echart_path) ?>'></script>

<script type="text/javascript">

const resizehandlers=[]
onresize=_=>{
  resizehandlers.map(f=>f())
}

function newChart(trans_params) {
  if(!document.body) {
    document.write('<div></div>')
  }

  let {
    title,
    query_info_path,
    extra_params,
    result_display_keys,
    result_display_keys_selected,
    options={},
  }=trans_params

  const onresizehandler=_=>{
    return [innerWidth, options.full_height? innerHeight: 300]
  }

  const panels=[], panels_data=[], charts=[]
  function init_panels(panel_data_ls) {
    if(panels.length) return;
    for(let i=0; i<panel_data_ls.length; i++) {
      const extra=panel_data_ls[i].extra || {}
      if(extra.title) {
        document.body.appendChild(document.createElement('div')).innerHTML=extra.title
      }
      const main=document.createElement('div')
      main.className='chartpanel chartpanel-'+i
      document.body.appendChild(main)
      let myChart=echarts.init(main)
      const fn=_=>{
        const [w, h]=onresizehandler()
        main.style.width=w+'px'
        main.style.height=h+'px'
        myChart.resize()
      }
      resizehandlers.push(fn)
      fn()
      charts.push(myChart)
      panels.push(main)
      panels_data.push([])
    }
  }

  let after=null, seq_maxlen=1, REC_FREQ=1
  const getdata=_=>new Promise(done=>{
    const a=new XMLHttpRequest
    a.open('GET', query_info_path+'?'+build_params(extra_params || {}, {after: after===null? 1: after}), 1)
    a.onreadystatechange=_=>{
      if(a.readyState<4) return
      try{
        let result=JSON.parse(a.responseText)
        if(!Array.isArray(result)) {
          result=[result]
        }
        init_panels(result)
        const res=result[0]
        after=(res.ls[res.ls.length-1] || {}).time || after
        REC_FREQ=res.REC_FREQ
        seq_maxlen=res.seq_maxlen
        done(result.map(a=>a.ls))
      }catch(e) {
        done()
      }
    }
    a.send()
  })

  const getopt=(inited, data)=>({
    title: {
      text: title,
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: Object.assign({
      data: result_display_keys,
    }, inited? {}: {
      selected: result_display_keys.reduce((x, k)=>{
        x[k]=result_display_keys_selected.includes(k)
        return x
      }, {}),
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
    series: result_display_keys.map((rk, i)=>{
      return {
        name: rk,
        type: 'line',
        data: data.map(a=>a.data[result_display_keys[i]]),
      }
    }),
  })

  ; (async _=>{
    for(let inited;;) {
      try{
        const panels_ls=await getdata()
        for(let i=0; i<panels_ls.length; i++) {
          const data=panels_data[i]
          const ls=panels_ls[i]
          const myChart=charts[i]
          data.push(...ls)
          while(data.length>seq_maxlen) data.shift()
          myChart.setOption(getopt(inited, data))
        }
        inited=1
        await sleep(panels_ls[0].length>2? 16: REC_FREQ*1e3)
      }catch(e) {
        await sleep(2e3)
      }
    }
  })()

}

newChart(<?js echo(JSON.stringify({
  title,
  query_info_path,
  extra_params,
  result_display_keys,
  result_display_keys_selected,
  options,
})) ?>)


function build_params(...p) {
  let u=[]
  const f=Object.assign(...p)
  for(let k in f) {
    u.push(k+'='+f[k])
  }
  return u.join('&')
}
function formatTimestamp(time) {
  const t=new Date
  t.setTime(time)
  return [t.getHours(),t.getMinutes(),t.getSeconds()].map(a=>{
    if(a<10) return '0'+a
    return a
  }).join(':')
}
const sleep=t=>new Promise(r=>setTimeout(r, t))

</script>
<?js
}

function timeline_get_after_value() {
	return +query.after
}

function timeline_pack_result({seq_maxlen, frequence, records}) {
	return {
		seq_maxlen,
    REC_FREQ: frequence,
    ls: records,
	}
}

function timeline_build_result(o) {
  return JSON.stringify(timeline_pack_result(o))
}


function timeline_merge_results(v, options={}) {
  const {
    sumkeys=[],
  }=options
  const {
    REC_FREQ,
    seq_maxlen,
  }=v[0]
  const rev={
    REC_FREQ,
    seq_maxlen,
    ls: [],
  }
  const _t={}
  for(let i=0; i<v.length; i++) {
    for(let q=v[i].ls, n=0; n<q.length; n++) {
      const {time, data}=q[n]
      const _time=Math.round(time/1e3)
      _t[_time]=_t[_time] || {ls: [], max_t: time}
      _t[_time].max_t=Math.max(_t[_time].max_t, time)
      _t[_time].ls.push(data)
    }
  }
  for(let _time in _t) {
    const _v=_t[_time].ls.reduce((a, b)=>{
      for(let k in b) {
        a[k]=a[k]*1+1*b[k]
      }
      return a
    })
    for(let k in _v) {
      if(sumkeys.includes(k)) continue
      _v[k]=(_v[k]/_t[_time].ls.length).toFixed(1)
    }
    rev.ls.push({
      data: _v,
      time: _t[_time].max_t,
    })
  }
  rev.ls.sort((a, b)=>{
    return a.time-b.time
  })
  return rev
}


exports({
	library_functions: {
		timeline_display,
    timeline_pack_result,
		timeline_build_result,
		timeline_get_after_value,
    timeline_merge_results,
	},
	plugin: true,
})
