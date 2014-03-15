/*global module, process, __dirname */
var app = module.exports = {};
var jade = require('jade'),
  log = require('metalogger')(),
  fs = require('fs'),
  async = require('async'),
  path = require('path');

//module.exports.errorhandler(options)

module.exports = function (options) {
  app.cachedControllers = {}; //cached controllers as a functions
  app.cachedViews = {}; // cached compiled Jade templates as a functions
  app.persistCache = {}; // cached final html

  options = options || {};
  app.opts = app.opts || {};
  app.routes = options.routes || {};
  app.opts.renderHook = options.renderHook || null;
  app.opts.cache = options.cache || process.env['NODE_ENV'] === 'production';
  app.opts.controllersPath = options.controllersPath || './app/controllers';
  app.opts.controllersPath += '/';
  app.opts.lib = options.lib || {};

  app.opts.getControllerFile = options.getControllerFile || function (controllerName) {
    return controllerName + "_controller.js";
  };
  app.opts.viewsPath = options.viewsPath ||
    (process.env['NODE_ENV'] === 'production' ? './app/min_views' : './app/views');
  app.opts.viewsPath += '/';
  app.opts.getViewFile = options.getViewFile || function (controllerName, actionName) {
    return controllerName + '/' + actionName + ".jade";
  };


  return function (req, res, next) {

    res.error500 = renderError500;
    var httpContext = prepareContext(req, res, next);
    var request = httpContext.request;
    if (httpContext.req.method != 'GET') request.action += '_' + httpContext.req.method.toString().toLowerCase();
    log.debug('parsed request', request);
    // search controller, it exists in cached dictionary, get from it and render
    var controller = searchController(httpContext);

    if (!controller && '__missing_controller' in app.routes) {
      httpContext.request = request = parseRequest(httpContext.req.url, true);
      controller = searchController(httpContext);
    }

    if (controller) {
      if (controller.__before)
        controller.__before.call(httpContext);

      if (httpContext.res.statusCode === 302)
        return;

      if (request.action in controller)
        controller[request.action].render(httpContext);

      else {
        httpContext.request.params[0] = httpContext.request.action;
        httpContext.request.action = '__missing_action';
        controller['__missing_action'].render(httpContext);
      }

    } else {
      httpContext.error404();
    }

  };
};

function searchController(httpContext) {

  var request = httpContext.request;
  if (request.controller in app.cachedControllers && (request.action in app.cachedControllers[request.controller] || '__missing_action' in controller)) { //
    return app.cachedControllers[request.controller];
  } else {

    var ctrlpath = app.opts.controllersPath + app.opts.getControllerFile(request.controller);

    if (fs.existsSync(ctrlpath)) {
      var controller = require(path.resolve(ctrlpath));
      if (controller && (request.action in controller) || '__missing_action' in controller) {
        app.cachedControllers[request.controller] = controller;
        return controller;

      } else {
        return null;
      }
    } else {

      return null;
    }
  }
}



Function.prototype.render = function (httpContext) {

  var onActionComplete = function (data) {

    var flash = fetchFlashMessages(httpContext);
    data = data || {};
    data.flash = flash;
    data.isAuth = httpContext.isAuth;
    var result = (function () {

      if (data.__json || (httpContext.req.query && httpContext.req.query.json) || httpContext.isXhr) {
        console.log('JSON');
        delete data.__json;
        httpContext.res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        return JSON.stringify(data);
      } else {
        if (data.__text)
          return data.__text;
        return compileJade(httpContext,
          app.opts.viewsPath + app.opts.getViewFile(httpContext.request.controller, httpContext.request.action))
        (data);
      }
    })();

    httpContext.res.end(result);
    if (app.opts.cache && data.__persist)
      app.persistCache[cacheKey] = result;

  };

  var cacheKey = httpContext.req.url;
  if (app.opts.renderHook)
    app.opts.renderHook(httpContext);
  // TODO: NO CACHE FOR POST/PUT AND IF FLUSH MESSAGES EXIST
  if (app.opts.cache && cacheKey in app.persistCache) {
    httpContext.res.end(app.persistCache[cacheKey]);
  } else {
    var data = this.call(httpContext, onActionComplete) || {
      '__skip': true
    };
    if (data.__skip)
      return; // async version of action
    else
      onActionComplete(data); // sync version of action
  }
};

function returnJson(httpContext, data) {
  httpContext.res.writeHead(200, {
    'Content-Type': 'application/json'
  });
  return JSON.stringify(data);
}

function fetchFlashMessages(httpContext) {
  if (httpContext.req.session && httpContext.req.session.flash) {
    var flash = httpContext.req.session.flash;
    delete httpContext.req.session.flash;
    return flash;
  }
  return null;
}

function prepareContext(req, res, next) {
  return {
    req: req,
    res: res,
    next: next,
    isAuth: 'isAuthenticated' in req ? req.isAuthenticated() : false,
    isXhr: isXhr(req.headers),
    request: parseRequest(req.url),
    async: async,
    lib: app.opts.lib,
    asJson: function (data) {
      data.__json = true;
      return data;
    },
    asText: function (data) {
      var d = {};
      d.__text = data;
      return d;
    },
    flash: function (message, to) {
      this.req.session.flash = message;
      if (req.query.json == 1)
        to += '?json=1';
      this.res.redirect(to);
    },
    error404: function () {
      renderError(404, res);
    },
    error500: function (err) {
      renderError(500, res, err);
    },
    customResponse: function (statusCode, err) {
      renderError(statusCode, res, err);
    },
    persistCache: function (data) {
      data.__persist = true;
      return data;
    }
  };
}

/*
 *
 * Custom error. If view file (erros/errorCode.jade) is not exist
 * then just passed error object to browser
 */

function renderError(errorCode, res, err) {
  res.writeHeader(errorCode);

  var html = compileJade(null,
    app.opts.viewsPath + app.opts.getViewFile('errors', 'error' + errorCode))
  ({
    title: errorCode,
    err: err || null
  });
  res.end(html);
}

/*
 *
 * 500 internal error. If view file (erros/errorCode.jade) is not exist
 * then just passed error object to browser
 */

function renderError500(res, err) {
  renderError(500, res, err);
}

/*
 * Parse raw req.url into object consist `controller`, `action` and `params`
 * `withMissing` is argument for extract alias for __missing_controller from route table
 */

function parseRequest(url, withMissing) {
  var path = url.split('?')[0];

  if (path in app.routes) {
    path = app.routes[path];
  } else if (withMissing && '__missing_controller' in app.routes)
    path = app.routes['__missing_controller'] + path;

  var parsed_request = {};
  // TODO: add checking first chat /
  var segments = path.split('/');
  parsed_request.controller = segments[1] || 'pages';
  parsed_request.action = segments[2] || "index";
  parsed_request.params = segments.slice(3, segments.length);

  return parsed_request;
}

/*
 * Compile .jade file into javascript function
 * If caching is enabled it try extract if from cache
 */
function compileJade(httpContext, filename) {


  if (app.opts.cache && app.cachedViews[filename])
    return app.cachedViews[filename];

  if (!fs.existsSync(filename)) {
    if (httpContext !== null)
      return function (data) {
        return returnJson(httpContext, data);
      };
    else
      return function (data) {
        return JSON.stringify(data);
      };
  }


  var prevDate = new Date();
  var options = {
    filename: filename,
    pretty: !app.opts.cache,
    compileDebug: !app.opts.cache, // If set to true, the tokens and function body is logged to stdout
    globals: [] //  Add a list of globals (as string names) to make accessible in templates
  };

  // Compile a function
  var fn = jade.compile(fs.readFileSync(filename, 'utf8'), options);
  log.info('compiled jade template: ', filename, " in ms: ", new Date() - prevDate);

  if (app.opts.cache)
    app.cachedViews[filename] = fn;

  return fn;
}

function isXhr(headers) {
  if ('x-requested-with' in headers)
    return headers['x-requested-with'].toLowerCase() === 'xmlhttprequest';
  if ('X-Requested-With' in headers)
    return headers['X-Requested-With'].toLowerCase() === 'xmlhttprequest';
  return false;
}