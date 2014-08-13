module.exports.two_callbacks = function (render) {
  // suppose we accicendtly return some answer, but not as a function result
  if (this.request.params.length === 0) {
    render(this.asText('first'));
  }
  // and then other
  render(this.asText('second'));
};


module.exports.many_callbacks = function (render) {
  var ctx = this;

  // and then other
  setTimeout(function() {
    if (ctx.request.params.length === 0) {
      render(ctx.asText('first'));
    }
    setTimeout(function() {
      setTimeout(function() {
        render(ctx.asText('second'));
      }, 20);
    }, 20);

  }, 20);

};
