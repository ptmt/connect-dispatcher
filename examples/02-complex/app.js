/* global __dirname:true, exports:true, process:true */
var log = require('metalogger')(),
  connect = require('connect'),
  dispatcher = require('../../dispatcher'),
  quip = require('quip'),
  log = require('metalogger')();

setup(connect()).listen(3002);
console.log('listen at 3002');

function setup (app) {
  "use strict";

  app.use(connect.json());
  app.use(connect.urlencoded());
  app.use(connect.query());
  app.use(connect.cookieParser('4jdapuj4qhgyp87a82'));
  app.use(connect.cookieSession({
    secret: 'no secrets',
    cookie: {
      maxAge: 60 * 60 * 1000
    }
  }));

  var aliases = {
    '/': '/pages/index',
    '/howitworks': '/pages/howitworks',
    '__missing_controller': '/pages/index'
  };
  app.use(dispatcher({
    routes: aliases,
    renderHook: function (ctx) {
      console.log('parsed request', ctx.request.controller + '/' + ctx.request.action + '/' + (ctx.request.params[0] || ''));
    }
  }));

  app.use(connect.errorHandler());

  app.use(function catchAllErrorHandler(err, req, res, next) {
    // Emergency: means system is unusable
    log.emergency('process exit', JSON.stringify(err));
    // workaround for displaying custom error
    res.error500(res, err);
    setTimeout(function () { // Give a chance for response to be sent, before killing the process
      process.exit(1);
    }, 100);

  });

  return app;

};
