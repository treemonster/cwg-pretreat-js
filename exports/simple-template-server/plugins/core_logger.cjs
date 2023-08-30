<?js

exports({
	library_functions: {},
	plugin: true,
})

if(Application.__LOGGER_INITIATED__) return;
Application.__LOGGER_INITIATED__=engineConfig.loggerConfig

const {
  Enable,
  Logfile,
  Errorfile,
}=engineConfig.loggerConfig

if(!Enable) return;
const {fs}=engineConfig.Api
const fp_log=fs.createWriteStream(Logfile)
const fp_err=fs.createWriteStream(Errorfile)

function hook(fn, fp) {
	const _out=process[fn].write
	process[fn].write=function(chunk, encoding, callback) {
		_out.call(process[fn], chunk, encoding)
	  fp.write(chunk, encoding, callback)
	}
}
hook('stdout', fp_log)
hook('stderr', fp_err)
