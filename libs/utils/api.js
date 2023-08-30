/**
 All core modules which may be used duraing the process life cycle should be declared in this file.
 This action is to ensure that the require function will not be called after custom code being excuted.
 */
module.exports={
  fs: require('fs'),
  crypto: require('crypto'),
  path: require('path'),
  os: require('os'),
  cluster: require('cluster'),
  net: require('net'),
  vm: require('vm'),
  http: require('http'),
  https: require('https'),
  url: require('url'),
  querystring: require('querystring'),
  module: require('module'),
}
