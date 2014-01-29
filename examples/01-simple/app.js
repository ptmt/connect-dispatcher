var app = require('connect')(),
  dispatcher = require('../../dispatcher.js');

// configure dispatcher to looking conrollers file at the same folder
// add alias for /
app.use(dispatcher({
  getControllerFile: function (ctrl) {
    return '/' + ctrl + '.js';
  },
  controllersPath: __dirname,
  routes: {
    '/': '/home/index'
  }
}));

app.listen(3001);
console.log('listen 3001');