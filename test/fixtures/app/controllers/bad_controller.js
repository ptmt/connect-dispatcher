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
    render(ctx.asText('first'));
    setTimeout(function() {
      console.log('a2');
      if (this.request.params.length === 0) {
        ctx.res.writeHead(302, {
          'Location': '/bad/two_callbacks'
        });
        ctx.res.end();
      }
      setTimeout(function() {
        console.log('a3');
        render(ctx.asText('third'));
      }, 20);
    }, 20);

  }, 20);

};
