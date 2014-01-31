module.exports.index = function () {
  return this.asText('pages_controller#index');
};

module.exports.twoway = function () {
  return 'pages_controller#twoway';
};

module.exports.return404 = function () {
  return this.error404();
};

module.exports.no_view = function () {
  return 'pages_controller#no_view';
};