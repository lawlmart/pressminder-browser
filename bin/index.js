"use strict";

var _events = require("./events");

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.handler = (() => {
  var _ref = _asyncToGenerator(function* (event, context) {
    try {
      const actions = [];
      const events = (0, _events.parseEvents)(event);
      const names = Object.keys(events);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = names[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          const name = _step.value;

          const eventPayloads = events[name];
          console.log("Executing " + eventPayloads.length.toString() + " " + name + " events");
          actions.push((0, _events.executeEvents)(name, eventPayloads));
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      yield Promise.all(actions);

      console.log("Handler finished");
      context.succeed();
    } catch (err) {
      console.log("Handler error: " + err);
      context.fail(err);
    }
  });

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();