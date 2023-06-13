#ifdef TYP1
function @ENAME(_wrapNamespace)(x) {
  return 'typ1/'+x
}
#endif
#ifdef TYP2
function @ENAME(_wrapNamespace)(x) {
  return 'typ2/'+x
}
#endif
console.log(@ENAME(_wrapNamespace)('index'))
