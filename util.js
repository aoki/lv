"use strict";

var util = require('util');
exports.dump = (v) => {
  return console.log(util.inspect(v, {'colors': true, 'depth': 10}));
};
