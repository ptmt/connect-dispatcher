/* global describe, before, it, process */
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
          done(err);
        });
    });

    it('should response with 404 if aciton in controlller without __missing_action does not exist', function (done) {
      requestApp()
        .post('/auth/index')
        .end(function (err, res) {
          expect(res.status).have.to.equal(404);
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

    it('should able to parse diffirent parameters', function (done) {
      requestApp()
        .post('/pages/three/1/2/3')
        .end(function (err, res) {
          expect(res.status).have.to.equal(200);
          expect(JSON.parse(res.text).length).have.to.equal(3)
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

  describe('options method', function () {

    it('should not affect to action', function (done) {
      requestApp()
          .options('/')
          .end(function (err, res) {
            expect(res.status).have.to.equal(200);
            expect(res.text).have.to.equal('pages_controller#index');
            done(err);
          });
    });

  });

  describe('Custom Responses', function () {

    it('400 Bad Request with custom error', function (done) {
      requestAppMissingCountroller()
        .get('/pages/error400')
        .end(function (err, res) {

          expect(res.statusCode).have.to.equal(400);
          var json = JSON.parse(res.text);
          expect(json.err).have.to.equal('Custom Error');
          done(err);
        });
    });

  });

  describe('Flash redirects', function () {

    it('should defaults to error', function (done) {
      requestAppMissingCountroller()
        .get('/pages/flasherror')
        .end(function (err, res) {
          var cookie = res.headers['set-cookie'];
          expect(res.statusCode).have.to.equal(302);

          requestAppMissingCountroller()
            .get('/pages/flasherror?no_flash=1')
            .set('cookie', cookie)
            .end(function (err1, res1) {

              var json = JSON.parse(res1.text);
              expect(json.flash.appearance).have.to.equal('error');
              expect(json.flash.message).have.to.equal('some_kind_of_error');
              done(err);
            });

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
  app.use(require('quip'));
  app.use(connect.cookieParser('4jdapuj4qhgyp87a82'));
  app.use(connect.cookieSession({
    secret: 'no secrets',
    cookie: {
      maxAge: 60 * 60 * 1000
    }
  }));
  app.use(dispatcher({
    routes: {
      '__missing_controller': '/pages/missing_controller'
    }
  }));

  return request(app);
}

function makeItBehindHttps(request) {
  return request
    .set('X-Forwarded-Proto', 'https')
    .set('X-Forwarded-For', '172.1.1.1');
}
