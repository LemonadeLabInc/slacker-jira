'use strict';

var expect = require('chai').expect;
var iterate = require('../lib/iterate');

describe('Iterate', function() {

  it('should iterate nicely', function(done) {
    let array = [];

    // Simple iteration
    iterate([1,2,3], (error) => {
      if (error) return done(error);
      try {
        expect(array).to.eql([1,2,3]);
        done();
      } catch (error) {
        done(error);
      }
    }, (item, cb) => {
      array.push(item);
      cb();
    });
  });

  it('should fail when exceptions are thrown', function(done) {
    let array = [];

    // Simple iteration
    iterate([1,2,3], (error) => {
      if (! error) return done(new Error('Expected an error'));
      if (error !== 'expected') return done(error);

      try {
        expect(array).to.eql([1]);
        done();
      } catch (error) {
        done(error);
      }
    }, (item, cb) => {
      if (item == 2) throw 'expected';
      array.push(item);
      cb();
    });
  });

  it('should fail when callbacks are invoked', function(done) {
    let array = [];
    iterate([1,2,3], (error) => {
      if (! error) return done(new Error('Expected an error'));
      if (error !== 'expected') return done(error);

      try {
        expect(array).to.eql([1]);
        done();
      } catch (error) {
        done(error);
      }
    }, (item, cb) => {
      if (item == 2) return cb('expected');
      array.push(item);
      cb();
    });
  });

  it('should continue when exceptions are thrown and we have an error handler', function(done) {
    let array = [];
    let errors = [];

    // Create an iterator
    let it = iterate((error, item, index) => {
      errors.push({ error: error, item: item, index: index });
    });

    // Iterate asynchronously
    it([1,2,3], (error) => {
      if (error) return done(error);

      try {
        expect(errors).to.eql([{ error: 'expected', item: 2, index: 1 }]);
        expect(array).to.eql([1, 3]);
        done();
      } catch (error) {
        done(error);
      }
    }, (item, cb) => {
      if (item == 2) throw 'expected';
      array.push(item);
      cb();
    });
  });

  it('should continue when callbacks are invoked and we have an error handler', function(done) {
    let array = [];
    let errors = [];

    // Create an iterator
    let it = iterate((error, item, index) => {
      errors.push({ error: error, item: item, index: index });
    });

    // Iterate asynchronously
    it([1,2,3], (error) => {
      if (error) return done(error);

      try {
        expect(errors).to.eql([{ error: 'expected', item: 2, index: 1 }]);
        expect(array).to.eql([1, 3]);
        done();
      } catch (error) {
        done(error);
      }
    }, (item, cb) => {
      if (item == 2) return cb('expected');
      array.push(item);
      cb();
    });
  });

});
