/* @flow */

var fs = require('fs');
var jade = require('jade');
var path = require('path');

                          
                       
                 
                          
                    
                              
                        
              
           
 


                                     
                               
                            
                             
              

  function Dispatcher(options)                              {"use strict";
    this.options = this.extend({
      renderHook: null,
      cache : process.env.NODE_ENV === 'production',
      controllersPath : './app/controllers',
      getControllerFile: function(controllerName)  {return controllerName + '_controller.js';},
      viewsPath:  (process.env.NODE_ENV === 'production' ? './app/min_views' : './app/views'),
      getViewFile: function(controllerName, actionName)  {return controllerName + '/' + actionName + '.jade';},
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

  Dispatcher.prototype.handle=function(req     , res     , next)           {"use strict";
    res.error500 = function(res, err)  {return this.renderError(500, res, err);}.bind(this);
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
  };

  Dispatcher.prototype.searchController=function(httpContext) {"use strict";
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
  };

  Dispatcher.prototype.prepareContext=function(req, res, next) {"use strict";
    res.redirect = function(to) {
      res.statusCode = 302;
      res.setHeader('Location', to);
      res.setHeader('Content-Length', '0');
      res.end();
    }
    return {
      req: req,
      res: res,
      next: next,
      isAuth: 'isAuthenticated' in req ? req.isAuthenticated() : false,
      isXhr: this.isXhr(req.headers),
      request: this.parseRequest(req.url),
      lib: this.options.lib,
      asJson: function(data)  {
        data.__json = true;
        return data;
      },
      asText: function(data)  {
        var d = {};
        d.__text = data;
        return d;
      },
      flash: function(message, appearance, to)  {
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
            res.redirect(to);
          }
        }
      }.bind(this),
      error404: function()  {return this.renderError(404, res);}.bind(this),
      error500: function(err)  {return this.renderError(500, res, err);}.bind(this),
      customResponse: function(statusCode, err)  {return this.renderError(statusCode, res, err);}.bind(this),
      persistCache: function(data)  {
        data.__persist = true;
        return data;
      }
    };
  };

  Dispatcher.prototype.render=function(f, httpContext) {"use strict";
    var app = this;

    var onActionComplete = function(data)  {

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
  };;

  Dispatcher.prototype.fetchFlashMessages=function(httpContext) {"use strict";
    if (httpContext.req.session && httpContext.req.session.flash) {
      var flash = httpContext.req.session.flash;
      httpContext.req.session.flash = null;
      return flash;
    }
    return null;
  };

  Dispatcher.prototype.parseRequest=function(url, withMissing) {"use strict";
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
  };


  Dispatcher.prototype.returnJson=function(httpContext, data)         {"use strict";
    httpContext.res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    return JSON.stringify(data);
  };

  Dispatcher.prototype.renderError=function(errorCode, res, err) {"use strict";
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
  };

  Dispatcher.prototype.extend=function()      {"use strict";
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key))
        {arguments[0][key] = arguments[i][key];}
    return arguments[0];
  };

  /*
  * Compile .jade file into javascript function
  * If caching is enabled it try extract if from cache
  */
  Dispatcher.prototype.compileJade=function(httpContext, filename) {"use strict";

    if (this.options.cache && this.cachedViews[filename]) {
      return this.cachedViews[filename];
    }

    if (!fs.existsSync(filename)) {
      return function(data)  {
        return httpContext !== null ?
        this.returnJson(httpContext, data) :
        JSON.stringify(data);
      }.bind(this);
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
  };

  Dispatcher.prototype.isXhr=function(headers)          {"use strict";
    if ('x-requested-with' in headers) {
      return headers['x-requested-with'].toLowerCase() === 'xmlhttprequest';
    }
    if ('X-Requested-With' in headers) {
      return headers['X-Requested-With'].toLowerCase() === 'xmlhttprequest';
    }
    return false;
  };



module.exports = function(options) {
  var d = new Dispatcher(options);
  return function(req, res, next)  {return d.handle(req, res, next);};
};
