'use strict';

var expect = require('chai').expect;
var merge = require('../lib/merge');

describe('Merge', function() {

  it('should return undefined with no parameters', function() {
    expect(merge()).to.be.undefined;
  });

  it('should return a simple clone with no parameters', function() {
    expect(merge(null)).to.be.null;
    expect(merge(1234)).to.equal(1234);
    expect(merge('xy')).to.equal('xy');
    expect(merge(true)).to.equal(true);

    expect(merge({a:1})).to.eql({a:1});

    expect(merge([1,2])).to.eql([1,2]);

    expect(merge(function() {})).to.equal(null);

    expect(merge({a:1,b:['a','b'],c:function() {}})).to.eql({a:1,b:['a','b']});

    expect(merge([1,2,'a','b',true,function() {}])).to.eql([1,2,'a','b',true,null]);
  });

  it('should override non-objects', function() {
    expect(merge(null, 'foo')).to.equal('foo');
    expect(merge(1234, 'foo')).to.equal('foo');
    expect(merge(true, 'foo')).to.equal('foo');
    expect(merge('xy', 'foo')).to.equal('foo');
    expect(merge({a:1}, 'foo')).to.equal('foo');

    expect(merge(null, {foo:'bar'})).to.eql({foo:'bar'});
    expect(merge(1234, {foo:'bar'})).to.eql({foo:'bar'});
    expect(merge(true, {foo:'bar'})).to.eql({foo:'bar'});
    expect(merge('xy', {foo:'bar'})).to.eql({foo:'bar'});
    expect(merge([1,2], {foo:'bar'})).to.eql({foo:'bar'});
  });

  it('should nicely merge two complex objects', function() {
    let a = {
      a: 1,
      b: 3,
      array: [ 1, 2, 3, 4 ],
      nested: { x: true, y: false, q: ['x'] },
      fn: function() {}
    };
    let b = {
      a: 2,
      c: 4,
      array: [ 'a', 'b', 'c' ],
      nested: { y: true, z: true, q: ['y', 'z'] },
      fn: function() {}
    }

    expect(merge(a, b)).to.eql({
      a: 2,
      b: 3,
      c: 4,
      array: [ 1, 2, 3, 4, 'a', 'b', 'c' ],
      nested: { x: true, y: true, z: true, q: ['x', 'y', 'z'] },
    });
  });

});

