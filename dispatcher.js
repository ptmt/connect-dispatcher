"use strict";
Object.defineProperties(exports, {
  default: {get: function() {
      return $__default;
    }},
  __esModule: {value: true}
});
var __moduleName = "dispatcher.es6";
function require(path) {
  return $traceurRuntime.require("dispatcher.es6", path);
}
var $__default = function(options) {
  var app = this;
  app.cachedControllers = {};
  app.cachedViews = {};
  app.persistCache = {};
  Object.assign(options, {
    opts: {
      renderHook: null,
      cache: process.env.NODE_ENV === 'production',
      controllersPath: './app/controllers',
      lib: {},
      viewsPath: './app/views'
    },
    routes: {}
  });
  app.opts.controllersPath += '/';
  app.opts.getControllerFile = options.getControllerFile || function(controllerName) {
    return controllerName + '_controller.js';
  };
  app.opts.viewsPath += '/';
  app.opts.getViewFile = options.getViewFile || function(controllerName, actionName) {
    return controllerName + '/' + actionName + '.jade';
  };
  return function(req, res, next) {
    res.error500 = renderError500;
    var httpContext = prepareContext(req, res, next);
    var request = httpContext.request;
    if (request.action.toLowerCase().indexOf('_post') > -1 || request.action.toLowerCase().indexOf('_delete') > -1) {
      httpContext.error404();
    }
    if (httpContext.req.method != 'GET' && httpContext.req.method != 'OPTIONS') {
      request.action += '_' + httpContext.req.method.toString().toLowerCase();
    }
    var controller = searchController(httpContext);
    if (!controller && '__missing_controller' in app.routes) {
      httpContext.request = request = parseRequest(httpContext.req.url, true);
      controller = searchController(httpContext);
    }
    if (controller) {
      if (controller.__before) {
        controller.__before.call(httpContext);
      }
      if (httpContext.res.statusCode === 302) {
        return;
      }
      if (request.action in controller) {
        controller[request.action].render(httpContext);
      } else {
        httpContext.request.params[0] = httpContext.request.action;
        httpContext.request.action = '__missing_action';
        controller['__missing_action'].render(httpContext);
      }
    } else {
      httpContext.error404();
    }
  };
};
;
function searchController(httpContext) {
  var request = httpContext.request;
  if (request.controller in app.cachedControllers && (request.action in app.cachedControllers[request.controller] || '__missing_action' in app.cachedControllers[request.controller])) {
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
Function.prototype.render = function(httpContext) {
  var onActionComplete = function(data) {
    var flash = fetchFlashMessages(httpContext);
    data = data || {};
    data.flash = data.flash || flash;
    data.isAuth = httpContext.isAuth;
    var result = (function() {
      if (data.__json || (httpContext.req.query && httpContext.req.query.json) || httpContext.isXhr) {
        delete data.__json;
        if (!httpContext.res.headersSent) {
          return returnJson(httpContext, data);
        }
      } else {
        if (data.__text) {
          return data.__text;
        }
        return compileJade(httpContext, app.opts.viewsPath + app.opts.getViewFile(httpContext.request.controller, httpContext.request.action))(data);
      }
    })();
    if (!httpContext.res.resultSent) {
      httpContext.res.end(result);
      httpContext.res.resultSent = true;
    }
    if (app.opts.cache && data.__persist) {
      app.persistCache[cacheKey] = result;
    }
  };
  var cacheKey = httpContext.req.url;
  if (app.opts.renderHook) {
    app.opts.renderHook(httpContext);
  }
  if (app.opts.cache && cacheKey in app.persistCache) {
    httpContext.res.end(app.persistCache[cacheKey]);
  } else {
    var data = this.call(httpContext, onActionComplete) || {'__skip': true};
    if (data.__skip) {
      return;
    } else {
      onActionComplete(data);
    }
  }
};
function returnJson(httpContext, data) {
  httpContext.res.writeHead(200, {'Content-Type': 'application/json'});
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
    asJson: function(data) {
      data.__json = true;
      return data;
    },
    asText: function(data) {
      var d = {};
      d.__text = data;
      return d;
    },
    flash: function(message, appearance, to) {
      if (!to) {
        to = appearance;
        appearance = 'error';
      }
      req.session.flash = {
        appearance: appearance,
        message: message
      };
      if (req.query.json == 1) {
        to += '?json=1';
      }
      if (req.query.access_token) {
        res.end(returnJson(this, req.session.flash));
      } else {
        if (!res.headerSent) {
          this.res.redirect(to);
        }
      }
    },
    error404: function() {
      renderError(404, res);
    },
    error500: function(err) {
      renderError(500, res, err);
    },
    customResponse: function(statusCode, err) {
      renderError(statusCode, res, err);
    },
    persistCache: function(data) {
      data.__persist = true;
      return data;
    }
  };
}
function renderError(errorCode, res, err) {
  if (!res.headersSent) {
    res.writeHeader(errorCode);
    var html = compileJade(null, app.opts.viewsPath + app.opts.getViewFile('errors', 'error' + errorCode))({
      title: errorCode,
      err: err || null
    });
    res.end(html);
  }
}
function renderError500(res, err) {
  renderError(500, res, err);
}
function parseRequest(url, withMissing) {
  var path = url.split('?')[0];
  if (path in app.routes) {
    path = app.routes[path];
  } else if (withMissing && '__missing_controller' in app.routes) {
    path = app.routes['__missing_controller'] + path;
  }
  var parsed_request = {};
  var segments = path.split('/');
  parsed_request.controller = segments[1] || 'pages';
  parsed_request.action = segments[2] || 'index';
  parsed_request.params = segments.slice(3, segments.length);
  return parsed_request;
}
function compileJade(httpContext, filename) {
  if (app.opts.cache && app.cachedViews[filename]) {
    return app.cachedViews[filename];
  }
  if (!fs.existsSync(filename)) {
    return function(data) {
      return httpContext !== null ? returnJson(httpContext, data) : JSON.stringify(data);
    };
  }
  var prevDate = new Date();
  var options = {
    filename: filename,
    pretty: !app.opts.cache,
    compileDebug: !app.opts.cache,
    globals: []
  };
  var fn = jade.compile(fs.readFileSync(filename, 'utf8'), options);
  console.debug('compiled jade template: ', filename, ' in ms: ', new Date() - prevDate);
  if (app.opts.cache) {
    app.cachedViews[filename] = fn;
  }
  return fn;
}
function isXhr(headers) {
  if ('x-requested-with' in headers) {
    return headers['x-requested-with'].toLowerCase() === 'xmlhttprequest';
  }
  if ('X-Requested-With' in headers) {
    return headers['X-Requested-With'].toLowerCase() === 'xmlhttprequest';
  }
  return false;
}
