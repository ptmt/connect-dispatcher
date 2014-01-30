connect-dispatcher
==================

Yet another Node.js Connect dispatcher module.

Why?

1. Conventions over configurations. No more large routes tables.
2. No direct views operations in conrollers. You can process first response on the server-side, then render same view and data in the browser. DRY-princple, reduce codebase.
2. 3-level caching. (controllers, views, persistEntirePage)
4. Small size footprint, just single file dispatcher.js.



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

Also see [tests](https://github.com/unknownexception/connect-dispatcher/tree/master/test) and [examples](https://github.com/unknownexception/connect-dispatcher/tree/master/examples) and read source code.

## Options

Full config example:

````
app.use(dispatcher({
  routes: { '/' : '/pages/home'}, 
  controllersPath:  'application/controllers',
  getControllerFile: function (name) { return name + '_controller.js';},
  cache : true, // by default it depends on NODE_ENV

}))
````
