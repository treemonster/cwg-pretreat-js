<?js

class BaseController extends Yaf_Controller_Abstract{
  displayLayoutView({content}) {
    this.getView().display(__VIEW_PATH__+'/layout.chtml', {content})
  }
}
