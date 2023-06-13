<?js

class IndexController extends BaseController {
  async init() {
    await super.init()
    echo('<h1>IndexController inited</h1>')
  }
  async indexAction() {
    echo('iscli: '+Yaf_Dispatcher.getInstance().getRequest().isCli())
    echo('<h1>this is the default action of IndexController</h1>')
    const tiModel=new Test_InfoModel(2, 4)
    echo(`<h3>type=${tiModel.getClassType()} name=${tiModel.getName()}</h3>`)
    if(await this.forward('login', 'check', {x: 'logined'})) {
      echo('logined')
    }else{
      echo('guest')
    }
  }
  async aaAction() {
    echo('<h1>this is aaAction of IndexController</h1>')
    const _view=this.getView()
    _view.assign({
      name: 'aaView'
    })
    echo(await this.render())
    _view.display('frag.chtml', {
      age: 35,
    })

    /*
    await this.redirect('/m1/m1/test')
    await this.redirect('/m1/m1/test2')
    */

    // console.log(Object.keys(global).join(' '))

  }
}
