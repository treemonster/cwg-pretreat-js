<?js

class MemoryController extends BaseController{
  indexAction() {
    this.getView().assign({
      timeline_args: {
        echart_path: '/js/echarts.min.js',
        query_info_path: '/memory/getinfo',
        title: 'memory usage (unit is: MB)',
        result_display_keys: ['heapUsed','rss', 'heapTotal', 'external'],
        result_display_keys_selected: ['heapUsed'],
      }
    })
    this.displayLayoutView({
      content: this.getView().render(),
    })
  }
  getinfoAction() {
    const [seq_maxlen, frequence, records]=getMemoryInfo(timeline_get_after_value())
    echo(timeline_build_result({
      seq_maxlen,
      frequence,
      records,
    }))
  }
  groupAction() {
    if(!isMaster) {
      throw new Error('current runtime mode is not `FPM`')
    }
    const ps_data=[{
      pid: process.pid,
      isMaster: 1,
    	iframe: '/memory',
    }]
    const prefix=url.match(/(^https?\:\/\/[^:\/]+)|$/)[1] || 'http://127.0.0.1'
    const {workersData}=masterData
    for(let pid in workersData) {
      ps_data.push({
        pid,
        isMaster: 0,
        iframe: prefix+':'+workersData[pid].FPM_externalPort+'/memory'
      })
    }
    this.getView().assign({
      ps_data,
    })
    this.displayLayoutView({
      content: this.getView().render(),
    })
  }
}
