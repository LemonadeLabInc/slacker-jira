'use strict';

function merge2(a, b) {

  // Check for NULLs
  if (b == null) return a;
  if (a == null) return b;

  // Check for proper objects
  if (typeof b !== 'object') return b;
  if (typeof a !== 'object') return b;

  // Concatenate or override arrays?
  if (Array.isArray(a)) {
    if (Array.isArray(b)) {
      return (a.concat(b));
    } else {
      return b;
    }
  }

  // Merge keys
  if ((typeof a !== 'object') || (typeof b !== 'object')) return b;

  // If both are arrays, just merge them
  let copy = {};
  new Set(Object.keys(a).concat(Object.keys(b))).forEach((key) => {
    copy[key] = merge2(a[key], b[key]);
  });
  return copy;
}

function merge() {
  // No arguments?
  if (arguments.length < 1) return undefined;
  if (arguments.length == 1) return merge(null, arguments[0]);

  let copy = JSON.parse(JSON.stringify(arguments[0]) || 'null');
  for (let i = 1; i < arguments.length; i ++) {
    copy = merge2(copy, JSON.parse(JSON.stringify(arguments[i]) || 'null'));
  }

  return copy;
}

module.exports = merge;
