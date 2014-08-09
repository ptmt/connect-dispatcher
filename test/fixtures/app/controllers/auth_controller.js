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
  console.log(some_undefined_var);
  return 'auth_controller#witherror';
};
