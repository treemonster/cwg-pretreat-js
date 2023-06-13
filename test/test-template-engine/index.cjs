<?js
_echo=echo
echo='dcsdc' // override `echo` function will not affect others
_echo('hello world\n')
_echo('engine is '+engine+'\n')
const {echo_text}=await include_file('./file1.cjs')
echo_text('---')
const {echo_text: _echo_text, echo_text_2}=await include_file('./file1.cjs')
_echo_text('>>>')
echo_text_2()
_echo('end\n')
_echo('\n\n\nexecute cost: '+time_recorder.cost()+'ms\n\n\n')