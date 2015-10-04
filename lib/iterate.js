'use strict';

// Construct with an error handler
function iterate(eh) {
  // If "eh" is an array, this is a simple iteration (no error handler)
  if (Array.isArray(eh)) return iterate(null).apply(this, arguments);

  // If specified, the error handler must be a function
  if (eh && (typeof eh !== 'function')) throw new Error('ErrorHandler not a function');

  // Our actual iterator function
  function it(array, cb, foreach) {

    // Must have a callback
    if (typeof cb !== 'function') throw new Error('No callback');

    // Must have a "forEach" function and argument must be an array
    if (typeof foreach !== 'function') return cb(new Error('ForEach not a function'));
    if (! Array.isArray(array)) return cb(new Error('Parameter not an array'));

    // Our "next" function
    function next(index) {
      // If we are over, simply callback
      if (array.length <= index) return cb();

      try {
        // Process the elemant at the current index
        foreach(array[index], (error) => {
          if (error) {
            if (eh) eh(error, array[index], index);
            else return cb(error);
          }
          setTimeout(() => next(index + 1));
        });
      } catch (error) {
        // Caught an error (in foreach)...
        if (eh) eh(error, array[index], index);
        else return cb(error);
        setTimeout(() => next(index + 1));
      }
    }

    // Start at the beginning
    next(0);
  }

  // Return our iterator function
  return it;
}

// Export our iterator
module.exports = iterate;
