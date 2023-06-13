<?js
class BaseController extends Yaf_Controller_Abstract{
  async init() {
    // console.log(this.constructor.name)
    echo('<h1>BaseController inited</h1>')
    // info()
    // await new Promise(r=>setTimeout(r, 100))
    echo(1918)
  }
}
