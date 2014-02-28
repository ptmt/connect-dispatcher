/* global __dirname:true, exports:true, process:true */
var log = require('metalogger')(),
  CONF = require('config'),
  connect = require('connect'),
  dispatcher = require('connect-dispatcher'),
  quip = require('quip'),
  log = require('metalogger')();

var db = require('../models');

exports = module.exports;

exports.setup = function (app) {

  "use strict";

  if ('undefined' === typeof process.env.NODE_ENV)
    process.env['NODE_ENV'] = 'development';

  if (process.env['NODE_SERVE_STATIC'] === '1' || 'undefined' === typeof process.env.NODE_SERVE_STATIC) {
    app.use(require('connect-livereload')());
    app.use(connect.static(__dirname + '/../../public'));
  } else {
    var newrelic = require('newrelic'); // enable New Relic monitoring
  }


  app.use(connect.json());
  app.use(connect.urlencoded());
  app.use(connect.query());

  require('./passport.js').setupPassport(app);
  app.use(connect.responseTime());

  var aliases = {
    '/': '/pages/index',
    '/howitworks': '/pages/howitworks',
    '/login': '/auth/login',
    '__missing_controller': '/items/destination'
  };
  app.use(dispatcher({
    routes: aliases,
    renderHook: function (ctx) {
      if (process.env['NODE_ENV'] === 'development')
        console.log('parsed request', ctx.request.controller + '/' + ctx.request.action + '/' + (ctx.request.params[0] || ''));
      else if (newrelic)
        newrelic.setTransactionName(ctx.request.controller + '/' + ctx.request.action);
    },
    lib: {
      noti: require('./notifications')
    }
  }));

  if (process.env['NODE_ENV'] === 'development') {
    app.use(connect.errorHandler());
  }

  app.use(function catchAllErrorHandler(err, req, res, next) {

    // Emergency: means system is unusable
    log.emergency('process exit', err);
    // workaround for displaying custom error
    res.error500(res, err);
    setTimeout(function () { // Give a chance for response to be sent, before killing the process
      process.exit(1);
    }, 100);

  });

};