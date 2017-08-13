'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.trigger = exports.executeEvents = undefined;

let executeEvents = exports.executeEvents = (() => {
  var _ref2 = _asyncToGenerator(function* (name, payloads) {
    let f;
    if (name == 'scan') {
      f = makeMulti(tasks.scanPage);
    } else {
      console.log("Unrecognized event " + name);
      return;
    }
    return f(payloads);
  });

  return function executeEvents(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();

let trigger = exports.trigger = (() => {
  var _ref3 = _asyncToGenerator(function* (name, data) {
    if (process.env.NODE_ENV == 'production') {
      return yield sendToStream('pressminder', name, data);
    } else {
      console.log("Executing event " + name + " immediately");
      return yield executeEvents(name, [data]);
    }
  });

  return function trigger(_x4, _x5) {
    return _ref3.apply(this, arguments);
  };
})();

exports.parseEvents = parseEvents;

var _kinesis = require('@heroku/kinesis');

var _kinesis2 = _interopRequireDefault(_kinesis);

var _tasks = require('./tasks');

var tasks = _interopRequireWildcard(_tasks);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const sendToStream = (stream, type, payload) => {
  return new Promise((resolve, reject) => {
    const base64data = new Buffer(JSON.stringify({
      type,
      payload
    })).toString('base64');
    const params = {
      Records: [{
        Data: base64data,
        PartitionKey: Math.random().toString()
      }],
      StreamName: stream
    };

    _kinesis2.default.request('PutRecords', params, { logger: { log: function log(m) {} } }, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject();
        return;
      }
      resolve();
    });
  });
};

function parseEvents(event) {
  const events = {};

  function addEvent(name, payload) {
    payload = payload || {};
    if (name in events) {
      events[name].push(payload);
    } else {
      events[name] = [payload];
    }
  }
  if ('Records' in event) {
    const promises = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = event['Records'][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        let record = _step.value;

        if ('kinesis' in record) {
          let string = Buffer.from(record['kinesis']['data'], 'base64').toString("utf8");
          let data = JSON.parse(string);
          addEvent(data.type, data.payload);
        } else {
          throw "Found unrecognized record type: " + JSON.stringify(record);
        }
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
  } else if ('type' in event) {
    addEvent(event.type, event.payload);
  } else {
    throw "No records found in event";
  }
  return events;
}

function makeMulti(f) {
  return (() => {
    var _ref = _asyncToGenerator(function* (inputs) {
      const promises = [];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = inputs[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          const input = _step2.value;

          promises.push(f(input));
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return Promise.all(promises);
    });

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  })();
}