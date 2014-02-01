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

module.exports.no_view_and_async = function (render) {
  render('pages_controller#no_view_and_async');
};

module.exports.missing_controller = function () {
  return this.asJson(this.request.params[0]);
};

module.exports.__missing_action = function () {
  return '__missing_action';
};