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


    it('should response with 404 if method does not exist', function (done) {

      requestApp()
        .get('/some_of_unexist_page')
        .end(function (err, res) {
          expect(res.status).have.to.equal(404);
          expect(res.text).have.to.equal('Not Found');
          done(err);
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

    it('should able to response with json when ?json=1 attached to uri', function (done) {

      requestApp()
        .get('/pages/twoway?json=1')
        .end(function (err, res) {

          var json = JSON.parse(res.text);
          expect(json).have.to.equal('pages_controller#twoway');
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
});

function requestApp() {
  var app = connect();
  app.use(connect.query());
  app.use(dispatcher());

  return request(app);
}