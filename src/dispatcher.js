/* @flow */

var fs = require('fs');
var jade = require('jade');
var path = require('path');

type DispatcherOptions = {
  renderHook: Function;
  cache: boolean;
  controllersPath: string;
  viewsPath: string;
  getControllerFile: Function;
  getViewFile: Function;
  routes: any;
  lib: any;
}

class Dispatcher {
  cachedControllers: Array<Function>;
  cachedViews: Array<Function>;
  cachedHtml: Array<string>;
  options: DispatcherOptions;
  routes: any;

  constructor(options: DispatcherOptions): Function {
    this.options = this.extend({
      renderHook: null,
      cache : process.env.NODE_ENV === 'production',
      controllersPath : './app/controllers',
      getControllerFile: (controllerName) => controllerName + '_controller.js',
      viewsPath:  (process.env.NODE_ENV === 'production' ? './app/min_views' : './app/views'),
      getViewFile: (controllerName, actionName) => controllerName + '/' + actionName + '.jade',
      lib: {},
      routes: {}
    }, options);
    this.routes = this.options.routes;
    this.options.controllersPath += '/';
    this.options.viewsPath += '/';
    this.cachedControllers = {};
    this.cachedViews = {};
    this.cachedHtml = {};
  }

  handle(req: any, res: any, next: Function) {
    res.error500 = (res, err) => this.renderError(500, res, err);
    var httpContext = this.prepareContext(req, res, next);
    var request = httpContext.request;

    // prevent GET request to imitate POST or DELETE
    if (request.action.toLowerCase().indexOf('_post') > -1
      || request.action.toLowerCase().indexOf('_delete') > -1) {
      httpContext.error404(); // may be 403 or something
    }

    // add special suffix to action name
    if (httpContext.req.method != 'GET' && httpContext.req.method != 'OPTIONS') {
      request.action += '_' + httpContext.req.method.toString().toLowerCase();
    }

    // search controller, it exists in cached dictionary, get from it and render
    var controller = this.searchController(httpContext);
    if (!controller && '__missing_controller' in this.routes) {
      httpContext.request = request = this.parseRequest(httpContext.req.url, true);
      controller = this.searchController(httpContext);
    }

    if (controller) {
      if (controller.__before) {
        controller.__before.call(httpContext);
      }
      if (httpContext.res.statusCode === 302) {
        return;
      }
      if (request.action in controller) {
        this.render(controller[request.action], httpContext);
      } else {
        httpContext.request.params[0] = httpContext.request.action;
        httpContext.request.action = '__missing_action';
        this.render(controller['__missing_action'], httpContext);
      }

    } else {
      httpContext.error404();
    }
  }

  searchController(httpContext) {
    var request = httpContext.request;
    if (request.controller in this.cachedControllers
      && (request.action in this.cachedControllers[request.controller]
        || '__missing_action' in this.cachedControllers[request.controller])
    ) {
      return this.cachedControllers[request.controller];
    } else {
      var ctrlpath = this.options.controllersPath + this.options.getControllerFile(request.controller);
      if (fs.existsSync(ctrlpath)) {
        var controller = require(path.resolve(ctrlpath));
        if (controller && (request.action in controller) || '__missing_action' in controller) {
          this.cachedControllers[request.controller] = controller;
          return controller;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }

  prepareContext(req, res, next) {
    return {
      req: req,
      res: res,
      next: next,
      isAuth: 'isAuthenticated' in req ? req.isAuthenticated() : false,
      isXhr: this.isXhr(req.headers),
      request: this.parseRequest(req.url),
      lib: this.options.lib,
      asJson: (data) => {
        data.__json = true;
        return data;
      },
      asText: (data) => {
        var d = {};
        d.__text = data;
        return d;
      },
      flash: (message, appearance, to) => {
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
          res.end(this.returnJson(this, req.session.flash));
        } else {
          if (!res.headerSent) {
            res.statusCode = 302;
            res.setHeader('Location', to);
            res.setHeader('Content-Length', '0');
            res.end();
          }
        }
      },
      error404: () => this.renderError(404, res),
      error500: err => this.renderError(500, res, err),
      customResponse: (statusCode, err) => this.renderError(statusCode, res, err),
      persistCache: data => {
        data.__persist = true;
        return data;
      }
    };
  }

  render (f, httpContext) {
    var app = this;

    var onActionComplete = data => {

      var flash = app.fetchFlashMessages(httpContext);

      data = data || {};
      data.flash = data.flash || flash;
      data.isAuth = httpContext.isAuth;
      var result = (function() {
        if (data.__json
            || (httpContext.req.query && httpContext.req.query.json)
            || httpContext.isXhr) {
          delete data.__json;
          if (!httpContext.res.headersSent) {
            return app.returnJson(httpContext, data);
          }
        } else {
          if (data.__text) {
            return data.__text;
          }
          return app.compileJade(httpContext,
            app.options.viewsPath + app.options.getViewFile(httpContext.request.controller,
              httpContext.request.action))
              (data);
            }
      })();

      if (!httpContext.res.resultSent) {
        httpContext.res.end(result);
        httpContext.res.resultSent = true;
      }
      if (app.options.cache && data.__persist) {
        app.cachedHtml[cacheKey] = result;
      }

    };

    var cacheKey = httpContext.req.url;
    if (this.options.renderHook) {
      this.options.renderHook(httpContext);
    }
    // TODO: NO CACHE FOR POST/PUT AND IF FLUSH MESSAGES EXIST
    if (this.options.cache && cacheKey in this.cachedHtml) {
      httpContext.res.end(this.cachedHtml[cacheKey]);
    } else {
      var data = f.bind(httpContext)(onActionComplete) || {
        '__skip': true
      };
      if (data.__skip) {
        return; // async version of action
      } else {
        onActionComplete(data); // sync version of action
      }
    }
  };

  fetchFlashMessages(httpContext) {
    if (httpContext.req.session && httpContext.req.session.flash) {
      var flash = httpContext.req.session.flash;
      httpContext.req.session.flash = null;
      return flash;
    }
    return null;
  }

  parseRequest(url, withMissing) {
    var path = url.split('?')[0];
    if (path in this.routes) {
      path = this.routes[path];
    } else if (withMissing && '__missing_controller' in this.routes) {
      path = this.routes['__missing_controller'] + path;
    }

    var parsed_request = {};
    // TODO: add checking first chat /
    var segments = path.split('/');
    parsed_request.controller = segments[1] || 'pages';
    parsed_request.action = segments[2] || 'index';
    parsed_request.params = segments.slice(3, segments.length);

    return parsed_request;
  }


  returnJson(httpContext, data): string {
    httpContext.res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    return JSON.stringify(data);
  }

  renderError(errorCode, res, err) {
    if (!res.headersSent) {
      res.writeHeader(errorCode);
      var html = this.compileJade(null,
        this.options.viewsPath + this.options.getViewFile('errors', 'error' + errorCode))
        ({
          title: errorCode,
          err: err || null
        });
        res.end(html);
    }
  }

  extend(): any {
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key))
        {arguments[0][key] = arguments[i][key];}
    return arguments[0];
  }

  /*
  * Compile .jade file into javascript function
  * If caching is enabled it try extract if from cache
  */
  compileJade(httpContext, filename) {

    if (this.options.cache && this.cachedViews[filename]) {
      return this.cachedViews[filename];
    }

    if (!fs.existsSync(filename)) {
      return data => {
        return httpContext !== null ?
        this.returnJson(httpContext, data) :
        JSON.stringify(data);
      };
    }

    var prevDate = new Date();
    var options = {
      filename: filename,
      pretty: !this.options.cache,
      compileDebug: !this.options.cache, // If set to true, the tokens and function body is logged to stdout
      globals: [] //  Add a list of globals (as string names) to make accessible in templates
    };

    // Compile a function
    var fn = jade.compile(fs.readFileSync(filename, 'utf8'), options);
    console.log('compiled jade template: ', filename, ' in ms: ', new Date() - prevDate);

    if (this.options.cache) {
      this.cachedViews[filename] = fn;
    }

    return fn;
  }

  isXhr(headers): boolean {
    if ('x-requested-with' in headers) {
      return headers['x-requested-with'].toLowerCase() === 'xmlhttprequest';
    }
    if ('X-Requested-With' in headers) {
      return headers['X-Requested-With'].toLowerCase() === 'xmlhttprequest';
    }
    return false;
  }

}

module.exports = function(options) {
  var d = new Dispatcher(options);
  return (req, res, next) => d.handle(req, res, next);
};

//
// /*global module, process, __dirname */
// var app = module.exports = {};
// var jade = require('jade'),
// log = require('metalogger')(),
// fs = require('fs'),
// async = require('async'),
// path = require('path');
//
// //module.exports.errorhandler(options)
//
// module.exports = function(options) {
//   app.cachedControllers = {}; //cached controllers as a functions
//   app.cachedViews = {}; // cached compiled Jade templates as a functions
//   app.persistCache = {}; // cached final html
//
//   options = options || {};
//   app.opts = app.opts || {};
//   app.routes = options.routes || {};
//   app.opts.renderHook = options.renderHook || null;
//   app.opts.cache = options.cache || process.env.NODE_ENV === 'production';
//   app.opts.controllersPath = options.controllersPath || './app/controllers';
//   app.opts.controllersPath += '/';
//   app.opts.lib = options.lib || {};
//
//   app.opts.getControllerFile = options.getControllerFile || function(
//     controllerName) {
//       return controllerName + '_controller.js';
//     };
//     app.opts.viewsPath = options.viewsPath ||
//     (process.env.NODE_ENV === 'production' ? './app/min_views' :
//     './app/views');
//     app.opts.viewsPath += '/';
//     app.opts.getViewFile = options.getViewFile || function(controllerName,
//       actionName) {
//         return controllerName + '/' + actionName + '.jade';
//       };
//
//       return function(req, res, next) {
//
//         res.error500 = renderError500;
//         var httpContext = prepareContext(req, res, next);
//         var request = httpContext.request;
//         if (request.action.toLowerCase().indexOf('_post') > -1 ||
//         request.action.toLowerCase().indexOf('_delete') > -1) {
//           httpContext.error404(); // should be 403 or something
//         }
//         if (httpContext.req.method != 'GET' &&
//         httpContext.req.method != 'OPTIONS') {
//           request.action += '_' + httpContext.req.method.toString().toLowerCase();
//         }
//         log.debug('parsed request', request);
//         // search controller, it exists in cached dictionary, get from it and render
//         var controller = searchController(httpContext);
//         if (!controller && '__missing_controller' in app.routes) {
//           httpContext.request = request = parseRequest(httpContext.req.url, true);
//           controller = searchController(httpContext);
//         }
//
//         if (controller) {
//           if (controller.__before) {
//             controller.__before.call(httpContext);
//           }
//           if (httpContext.res.statusCode === 302) {
//             return;
//           }
//           if (request.action in controller) {
//             controller[request.action].render(httpContext);
//           } else {
//             httpContext.request.params[0] = httpContext.request.action;
//             httpContext.request.action = '__missing_action';
//             controller['__missing_action'].render(httpContext);
//           }
//
//         } else {
//           httpContext.error404();
//         }
//
//       };
//     };
//
//     function searchController(httpContext) {
//
//       var request = httpContext.request;
//       if (request.controller in app.cachedControllers && (request.action in app.cachedControllers[
//         request.controller] || '__missing_action' in app.cachedControllers[
//         request.controller])) { //
//           return app.cachedControllers[request.controller];
//         } else {
//
//           var ctrlpath = app.opts.controllersPath + app.opts.getControllerFile(
//             request.controller);
//
//             if (fs.existsSync(ctrlpath)) {
//               var controller = require(path.resolve(ctrlpath));
//               if (controller && (request.action in controller) || '__missing_action' in
//               controller) {
//                 app.cachedControllers[request.controller] = controller;
//                 return controller;
//
//               } else {
//                 return null;
//               }
//             } else {
//
//               return null;
//             }
//           }
//         }
//
//         Function.prototype.render = function(httpContext) {
//
//           var onActionComplete = function(data) {
//
//             var flash = fetchFlashMessages(httpContext);
//
//             data = data || {};
//             data.flash = data.flash || flash;
//             data.isAuth = httpContext.isAuth;
//             var result = (function() {
//
//               if (data.__json || (httpContext.req.query && httpContext.req.query.json) ||
//               httpContext.isXhr) {
//
//                 delete data.__json;
//                 if (!httpContext.res.headersSent) {
//                   return returnJson(httpContext, data);
//
//                 }
//               } else {
//                 if (data.__text) {
//                   return data.__text;
//                 }
//                 return compileJade(httpContext,
//                   app.opts.viewsPath + app.opts.getViewFile(httpContext.request.controller,
//                     httpContext.request.action))
//                     (data);
//                   }
//                 })();
//                 if (!httpContext.res.resultSent) {
//                   httpContext.res.end(result);
//                   httpContext.res.resultSent = true;
//                 }
//                 if (app.opts.cache && data.__persist) {
//                   app.persistCache[cacheKey] = result;
//                 }
//
//               };
//
//               var cacheKey = httpContext.req.url;
//               if (app.opts.renderHook) {
//                 app.opts.renderHook(httpContext);
//               }
//               // TODO: NO CACHE FOR POST/PUT AND IF FLUSH MESSAGES EXIST
//               if (app.opts.cache && cacheKey in app.persistCache) {
//                 httpContext.res.end(app.persistCache[cacheKey]);
//               } else {
//                 var data = this.call(httpContext, onActionComplete) || {
//                   '__skip': true
//                 };
//                 if (data.__skip) {
//                   return; // async version of action
//                 } else {
//                   onActionComplete(data); // sync version of action
//                 }
//               }
//             };
//
//             function returnJson(httpContext, data) {
//               httpContext.res.writeHead(200, {
//                 'Content-Type': 'application/json'
//               });
//               return JSON.stringify(data);
//             }
//
//             function fetchFlashMessages(httpContext) {
//
//               if (httpContext.req.session && httpContext.req.session.flash) {
//                 var flash = httpContext.req.session.flash;
//                 delete httpContext.req.session.flash;
//                 return flash;
//               }
//               return null;
//             }
//
//             function prepareContext(req, res, next) {
//               return {
//                 req: req,
//                 res: res,
//                 next: next,
//                 isAuth: 'isAuthenticated' in req ? req.isAuthenticated() : false,
//                 isXhr: isXhr(req.headers),
//                 request: parseRequest(req.url),
//                 async: async,
//                 lib: app.opts.lib,
//                 asJson: function(data) {
//                   data.__json = true;
//                   return data;
//                 },
//                 asText: function(data) {
//                   var d = {};
//                   d.__text = data;
//                   return d;
//                 },
//                 flash: function(message, appearance, to) {
//                   if (!to) {
//                     to = appearance;
//                     appearance = 'error';
//                   }
//                   req.session.flash = {
//                     appearance: appearance,
//                     message: message
//                   };
//                   if (req.query.json == 1) {
//                     to += '?json=1';
//                   }
//                   if (req.query.access_token) {
//                     res.end(returnJson(this, req.session.flash));
//                   } else {
//                     if (!res.headerSent) {
//                       this.res.redirect(to);
//                     }
//                   }
//
//                 },
//                 error404: function() {
//                   renderError(404, res);
//                 },
//                 error500: function(err) {
//                   renderError(500, res, err);
//                 },
//                 customResponse: function(statusCode, err) {
//                   renderError(statusCode, res, err);
//                 },
//                 persistCache: function(data) {
//                   data.__persist = true;
//                   return data;
//                 }
//               };
//             }
//
//             /*
//             *
//             * Custom error. If view file (erros/errorCode.jade) is not exist
//             * then just passed error object to browser
//             */
//
//             function renderError(errorCode, res, err) {
//               if (!res.headersSent) {
//                 res.writeHeader(errorCode);
//
//                 var html = compileJade(null,
//                   app.opts.viewsPath + app.opts.getViewFile('errors', 'error' + errorCode))
//                   ({
//                     title: errorCode,
//                     err: err || null
//                   });
//                   res.end(html);
//                 }
//               }
//
//               /*
//               *
//               * 500 internal error. If view file (erros/errorCode.jade) is not exist
//               * then just passed error object to browser
//               */
//
//               function renderError500(res, err) {
//                 renderError(500, res, err);
//               }
//
//               /*
//               * Parse raw req.url into object consist `controller`, `action` and `params`
//               * `withMissing` is argument for extract alias for __missing_controller from route table
//               */
//
//               function parseRequest(url, withMissing) {
//                 var path = url.split('?')[0];
//
//                 if (path in app.routes) {
//                   path = app.routes[path];
//                 } else if (withMissing && '__missing_controller' in app.routes) {
//                   path = app.routes['__missing_controller'] + path;
//                 }
//
//                 var parsed_request = {};
//                 // TODO: add checking first chat /
//                 var segments = path.split('/');
//                 parsed_request.controller = segments[1] || 'pages';
//                 parsed_request.action = segments[2] || 'index';
//                 parsed_request.params = segments.slice(3, segments.length);
//
//                 return parsed_request;
//               }
//
//               /*
//               * Compile .jade file into javascript function
//               * If caching is enabled it try extract if from cache
//               */
//               function compileJade(httpContext, filename) {
//
//                 if (app.opts.cache && app.cachedViews[filename]) {
//                   return app.cachedViews[filename];
//                 }
//
//                 if (!fs.existsSync(filename)) {
//
//                   return function(data) {
//                     return httpContext !== null ?
//                     returnJson(httpContext, data) :
//                     JSON.stringify(data);
//                   };
//
//                 }
//
//                 var prevDate = new Date();
//                 var options = {
//                   filename: filename,
//                   pretty: !app.opts.cache,
//                   compileDebug: !app.opts.cache, // If set to true, the tokens and function body is logged to stdout
//                   globals: [] //  Add a list of globals (as string names) to make accessible in templates
//                 };
//
//                 // Compile a function
//                 var fn = jade.compile(fs.readFileSync(filename, 'utf8'), options);
//                 log.info('compiled jade template: ', filename, ' in ms: ', new Date() -
//                 prevDate);
//
//                 if (app.opts.cache) {
//                   app.cachedViews[filename] = fn;
//                 }
//
//                 return fn;
//               }
//
//               function isXhr(headers) {
//                 if ('x-requested-with' in headers) {
//                   return headers['x-requested-with'].toLowerCase() === 'xmlhttprequest';
//                 }
//                 if ('X-Requested-With' in headers) {
//                   return headers['X-Requested-With'].toLowerCase() === 'xmlhttprequest';
//                 }
//                 return false;
//               }
