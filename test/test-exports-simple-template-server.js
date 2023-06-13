const {server}=require('../exports/simple-template-server')
server({
  dir: __dirname+'/test-exports-simple-template-server',
  listen: 9090,
  exts: ['.html', '.cjs'],
  index: ['index.cjs', 'index.html'],
  error: 'error.cjs',
  forbidden: ['node_modules'],
  walk: true,
  debugging: true,

  common: {
    monitor: true,
    locally: false,
    silent: false,
  },

  fpm: {
    workers: 4,
    listen: 20000,
  },

})
