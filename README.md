connect-dispatcher
==================

Yet another Node.js Connect dispatcher module.

Why?

1. Conventions over configurations. No more large routes tables.
2. Controller return data to views, explicit or implicit render it depends from context. You can process first response on the server-side, then render the same view in the browser.
2. Cache controllers, views or persist in cache entire page. Currently cache stored in memory, but not a big deal move on to Redis.
4. Small size footprint, just single file dispatcher.js

## Getting started

First, install packages via npm:

````
npm install connect-dispatcher
````
(also `npm install connect` if needed).

Second, create new file called `app.js`:

````
var app = require('connect')(),
  dispatcher = require('connect-dispatcher');

app.use(dispatcher());

app.listen(3001);
````

By default the connect-dispatcher trying to look for controller with the name `app/controllers/pages_controller.js` where looking public method `index`. To avoid 404 error we need as simple controller as this `pages_controller.js`:

````
var pages = module.exports;

pages.index = function () {
  return this.asText('Hello World!');
};
````

It produces simple response to the browser, without view rendering. To enable this, change code to:

````
var pages = module.exports;

pages.index = function () {
  return {
    title:'Hello World!'
  };
};
````

and add jade template. By default, the destanation of this view is `app/views/pages/index.jade`

````
h1= title
````

After server is restarted, refresh the browser to see html response:

````
<h1> Hello World! </h1>
````

For more information see [examples](https://github.com/unknownexception/connect-dispatcher/tree/master/examples) and [tests](https://github.com/unknownexception/connect-dispatcher/tree/master/test).

## Options

Full config example:

````
app.use(dispatcher({
  routes: { '/' : '/pages/home'},
  controllersPath:  'application/controllers',
  getControllerFile: function (name) { return name + '_controller.js';},
  viewsPath: 'application/views', // by default it depends on NODE_ENV (useful for grunt usemin)
  getViewFile: function (controller, action) { return controller + '/' + action + '.jade';}
  cache : true, // by default it depends on NODE_ENV

}))

````
