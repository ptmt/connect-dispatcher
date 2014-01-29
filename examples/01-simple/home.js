/*global module*/

var home = module.exports;

home.index = function () {
  return this.asText('hello world');
};