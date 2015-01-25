connect-dispatcher
==================
[ ![Codeship Status for unknownexception/connect-dispatcher](https://www.codeship.io/projects/11527a50-f90d-0131-a739-5e0e92dbe03c/status)](https://www.codeship.io/projects/28799)

_Disclaimer_. `connect-dispatcher` is outdated. See koajs, rest, react-router or other frameworks. 

Why?

1. Conventions over configurations. DRY routes.
2. It has to be simple. A controller returns data to a views, rendering the different type of views depend on the context.
You can process the first response on the server-side, then render the same view in the browser.
2. Caching controllers, views, or the entire html. Cache stored in a memory, but there is no a big deal about moving to Redis.
4. Small size footprint, just single file src/dispatcher.js written with typed Flow ES6.

For more information see [examples](https://github.com/unknownexception/connect-dispatcher/tree/master/examples) and [tests](https://github.com/unknownexception/connect-dispatcher/tree/master/test).

## Getting started

First, install packages via npm:

```JavaScript
npm install connect-dispatcher
```

Second, create a new file `app.js`:

```JavaScript
var app = require('connect')(),
  dispatcher = require('connect-dispatcher');

app.use(dispatcher());

app.listen(3001);
```

By default the connect-dispatcher trying to look for controller with the name `app/controllers/pages_controller.js` whithing exported method `index`. So to avoid 404 error we need as simple controller as this `pages_controller.js`:

```JavaScript
var pages = module.exports;

pages.index = function () {
  return this.asText('Hello World!');
};
```

It produces simple plain-text response to the browser, without view rendering. To enable template-engine rendering, change code to:

```JavaScript
var pages = module.exports;

pages.index = function () {
  return {
    title:'Hello World!'
  };
};
```

and add to project a jade template. By default, the location of this view is `app/views/pages/index.jade`

```Jade
h1= title
```

After server is restarted, refresh the browser to see html response (if you are not using livereload):

```HTML
<h1> Hello World! </h1>
```


## Options

Full config example:

```JavaScript
app.use(dispatcher({
  routes: { '/' : '/pages/home'},
  controllersPath:  'application/controllers',
  getControllerFile: function (name) { return name + '_controller.js';},
  viewsPath: 'application/views', // by default it depends on NODE_ENV (useful for grunt usemin)
  getViewFile: function (controller, action) { return controller + '/' + action + '.jade';}
  cache : true, // by default it depends on NODE_ENV
  renderHook: function (ctx) { console.log ('before render ' + ctx.request.controller + '/' + ctx.request.action)}

}))
```

## TODO

-[] DI;
-[] Remove all dependencies;
