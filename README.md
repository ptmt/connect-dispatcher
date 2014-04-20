connect-dispatcher
==================

Node.js connect module. Yet another.

Why?

1. Conventions over configurations. No more huge routes tables.
2. It has to be simple. A controller returns data to a views, explicit or implicit renders the diffirent type of views depends from context.
You can process a first response on the server-side, then render the same view in the browser.
2. Caching controllers, views or you can persist in a cache the entire page. Currently cache stored in a memory, but not a big deal move on to Redis.
4. Small size footprint, just single file dispatcher.js

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
