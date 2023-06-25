<?js
class MemoryController extends Yaf_Controller_Abstract{
  init() {
    this.query_info_path_prefix='/'+this.getModuleName()+'/'+this.getName()
  }
  indexAction() {
    echo('<center><h1>Memory Usage Monitor</h1></center>')
    timeline_display({
      echart_path: '/js/echarts.min.js',
      query_info_path: this.query_info_path_prefix+'/getMemoryInfo',
      title: '',
      result_display_keys: ['heapUsed','rss', 'heapTotal', 'external'],
      result_display_keys_selected: ['heapUsed'],
    })
  }
  async getMemoryInfoAction() {
    header('content-type', 'text/json')
    if(RUNTIME_MODE==='FPM') {
      const v=await curl({url: 'http://127.0.0.1:'+process.env.FPM_masterExternalPort+this.query_info_path_prefix+'/getFpmMemoryInfos?after='+query.after})
      echo(v.responseBody.toString('utf8'))
    }else{
      await this.forward('getSelfMemoryInfo')
    }
  }

  getFpmMemoryInfosAction() {
    if(RUNTIME_MODE!=='FPM_Master') {
      setStatusCode(444)
      return
    }
    const res=[]
    res.push(this.forward('getSelfMemoryInfo', {isForward: 1}))
    for(let pid in masterData.workers) {
      res.push(curl({url: 'http://127.0.0.1:'+masterData.workers[pid].FPM_externalPort+this.query_info_path_prefix+'/getSelfMemoryInfo?after='+query.after}).then(x=>{
        return JSON.parse(x.responseBody.toString('utf8'))
      }))
    }
    echo(Promise.all(res).then(x=>JSON.stringify(x)))
  }
  getSelfMemoryInfoAction() {
    const [seq_maxlen, frequence, records]=getMemoryInfo(timeline_get_after_value())
    const v=timeline_pack_result({
      seq_maxlen,
      frequence,
      records,
    })
    if(RUNTIME_MODE==='FPM_Master') {
      v.extra={
        title: `<center><h3><font color=red>master</font> pid=${process.pid}</h3></center>`,
      }
    }else{
      if(RUNTIME_MODE==='FPM') {
        v.extra={
          title: `<center><h3>worker[${+process.env.FPM_workerIndex+1}/${process.env.FPM_workersCount}] pid=${process.pid}</h3></center>`,
        }
      }else{
        // fastcgi mode
      }
    }
    if(this.getInvokeArg('isForward')===1) {
      return v
    }
    echo(JSON.stringify(v))
  }
}