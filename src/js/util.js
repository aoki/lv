'use strict';

require('colors');
var util = require('util');

exports.dump = (v) => {
  let tmp = util.inspect(v, {'colors': true, 'depth': 10});
  console.log(tmp);
  return tmp;
};

exports.info = (str) => {
  let tmp = str.green;
  console.log(tmp);
  return tmp;
};

exports.error = (str) => {
  let tmp = str.red;
  console.log(tmp);
  return tmp;
};
