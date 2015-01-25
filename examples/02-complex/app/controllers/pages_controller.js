module.exports.index = function() {
  return {
    title: "title"
  }
}

module.exports.howitworks = function () {
  if (!this.req.query.no_flash) {
    this.req.session.some = 1;
    return this.flash('some_kind_of_error', '/pages/howitworks?no_flash=1');
  } else {

    return this.asJson({
      somethins: 'usual'
    });
  }
}
