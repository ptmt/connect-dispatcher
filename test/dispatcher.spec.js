var expect = require('chai').expect,
  connect = require('connect'),
  //  mocks = require('mocks')

  dispatcher = require('../dispatcher.js'),
  request = require('supertest');

describe('Dispatcher', function () {

  before(function (done) {
    process.chdir('./test/fixtures');
    done();
  });

  describe('default configuration', function () {

    it('should route to pages/index by default', function (done) {
      requestApp()
        .get('/')
        .end(function (err, res) {

          expect(res.status).have.to.equal(200);
          expect(res.text).have.to.equal('pages_controller#index');
          done(err);
        });
    });


    it('should response with 404 if controller does not exist', function (done) {
      requestApp()
        .get('/some_of_unexist_page')
        .end(function (err, res) {
          expect(res.status).have.to.equal(404);
          expect(res.text).have.to.equal('Not Found');
          done(err);
        });
    });

    it('should response with 404 if aciton in controlller without __missing_action does not exist', function (done) {
      requestApp()
        .post('/auth/index')
        .end(function (err, res) {

          expect(res.status).have.to.equal(404);
          expect(res.text).have.to.equal('Not Found');
          done(err);
        });
    });

    it('should response with 404 if controller already cached', function (done) {
      requestApp()
        .get('/auth/index')
        .end(function () {
          requestApp()
            .post('/auth/index')
            .end(function (err, res) {
              expect(res.status).have.to.equal(404);
              expect(res.text).have.to.equal('Not Found');
              done(err);
            });
        });
    });


    it('should able to response with json when xhr request', function (done) {
      requestApp()
        .get('/pages/twoway')
        .set('X-Requested-With', 'XMLHttpRequest')
        .end(function (err, res) {

          var json = JSON.parse(res.text);
          expect(json).have.to.equal('pages_controller#twoway');
          done(err);
        });
    });

    it('should response with json when ?json=1 attached to uri', function (done) {
      requestApp()
        .get('/pages/twoway?json=1')
        .end(function (err, res) {

          var json = JSON.parse(res.text);
          expect(json).have.to.equal('pages_controller#twoway');
          done(err);
        });
    });

    it('should response with json when view is not exist', function (done) {
      requestApp()
        .get('/pages/no_view')
        .end(function (err, res) {
          var json = JSON.parse(res.text);
          expect(json).have.to.equal('pages_controller#no_view');
          done(err);
        });
    });

    it('should response with json when method is POST and view is not exist', function (done) {
      requestApp()
        .post('/pages/no_view')
        .end(function (err, res) {

          var json = JSON.parse(res.text);
          expect(json).have.to.equal('pages_controller#no_view');
          done(err);
        });
    });

    it('should response with json when view is not exist and ?json=1 specified', function (done) {
      requestApp()
        .get('/pages/no_view_and_async?json=1')
        .end(function (err, res) {

          var json = JSON.parse(res.text);
          expect(json).have.to.equal('pages_controller#no_view_and_async');
          done(err);
        });
    });



    it('should response with 404 method call this.error404()', function (done) {
      requestApp()
        .get('/pages/return404')
        .end(function (err, res) {
          expect(res.status).have.to.equal(404);
          done(err);
        });
    });


    it('should execute __before filter before each request', function (done) {
      requestApp()
        .get('/auth/witherror')
        .end(function (err, res) {

          expect(res.statusCode).have.to.equal(302);
          done(err);
        });
    });

  });

  describe('__missing_controller', function () {

    it('should dispatch to specific controller according to options.routes', function (done) {
      requestAppMissingCountroller()
        .get('/unexisting_page')
        .end(function (err, res) {

          expect(res.statusCode).have.to.equal(200);
          var json = JSON.parse(res.text);
          expect(json).have.to.equal('unexisting_page');
          done(err);
        });
    });

  });

});

function requestApp() {
  var app = connect();
  app.use(connect.query());
  app.use(dispatcher());

  return request(app);
}

function requestAppMissingCountroller() {
  var app = connect();
  app.use(connect.query());
  app.use(dispatcher({
    routes: {
      '__missing_controller': '/pages/missing_controller'
    }
  }));

  return request(app);
}