<?js

const state={
  opened: false,
  output: [''],
  _echo: __SINGLETON__.interfaces.echo,
  _ob_echo: (...argv)=>{
    state.output.push(...argv)
  },
}

function ob_open() {
  if(state.opened) {
    throw new Error('ob_open() cannot been called when it has already opened')
  }
  state.opened=true
  state.output=['']
  __SINGLETON__.interfaces.echo=state._ob_echo
  __SINGLETON__.contexts.map(ctx=>{
    ctx.echo=state._ob_echo
  })
}

function ob_close() {
  if(!state.opened) {
    throw new Error('you must call ob_open() before calling ob_close()')
  }
  __SINGLETON__.interfaces.echo=state._echo
  __SINGLETON__.contexts.map(ctx=>{
    ctx.echo=state._echo
  })
  state.opened=false
}

async function ob_get_string() {
  const v=Promise.all(state.output)
  state.output=['']
  return (await v).join('')
}

exports({
	library_functions: {
		ob_open,
		ob_get_string,
		ob_close,
	},
	plugin: true,
})
