module.exports.index = function () {
  return this.asText('pages_controller#index');
};

module.exports.twoway = function () {
  return 'pages_controller#twoway';
};

module.exports.return404 = function () {
  return this.error404();
};

module.exports.no_view = module.exports.no_view_post = function () {
  return 'pages_controller#no_view';
};

module.exports.no_view_and_async = function (asyncRender) {
  setTimeout(function longTask() {
    asyncRender('pages_controller#no_view_and_async');
  }, 100);

};

module.exports.three_post = function () {
    return this.request.params;
}
module.exports.flasherror = function () {
  if (!this.req.query.no_flash) {
    this.req.session.some = 1;
    return this.flash('some_kind_of_error', '/pages/flasherror?no_flash=1');
  } else {

    return this.asJson({
      somethins: 'usual'
    });
  }

};


module.exports.missing_controller = function () {
  return this.asJson(this.request.params[0]);
};

module.exports.__missing_action = function () {
  return '__missing_action';
};

module.exports.error400 = function () {
  this.customResponse(400, 'Custom Error');
};
