<?js
class LoginController extends BaseController{
  async checkAction() {
    const {x}=this.getInvokeArgs()
    await sleep(1)
    return x==='logined'
  }
}
