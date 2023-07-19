(function(){

var F={G:function(){
  console.log(this.Z)
}}

F.G.prototype={
  Z: 234
}

console.log(new F.G())

})()