<?js

class IndexController extends BaseController{
  indexAction() {
    const _view=this.getView()
    if(isMaster) {
      _view.assign({
        title: 'FPM Master Monitor',
        links: [
          {name: 'Memory', link: '/memory/group'},
        ],
      })
    }else{
      _view.assign({
        title: 'FastCGI Monitor',
        links: [
          {name: 'Memory', link: '/memory'},
        ],
      })
    }
    this.displayLayoutView({
      content: _view.render()
    })
  }
  defaultAction() {
    endWithFile({filename: __ASSETS_PATH__+pathname})
  }
}
