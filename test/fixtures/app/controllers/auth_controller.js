module.exports.__before = function () {
  this.res.writeHead(302, {
    'Location': '/home/index'

  });
  this.res.end();
  return;
};

module.exports.index = function () {
  return 'auth_controller#index';
};

module.exports.witherror = function () {
  console.log(blabla);
  return 'auth_controller#witherror';
};