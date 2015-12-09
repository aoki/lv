'use strict';

require('colors');
var util = require('util');

exports.dump = function (v) {
  var tmp = util.inspect(v, { 'colors': true, 'depth': 10 });
  console.log(tmp);
  return tmp;
};

exports.info = function (str) {
  var tmp = str.green;
  console.log(tmp);
  return tmp;
};

exports.error = function (str) {
  var tmp = str.red;
  console.log(tmp);
  return tmp;
};