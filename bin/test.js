'use strict';

let test = (() => {
  var _ref = _asyncToGenerator(function* () {
    yield (0, _events.trigger)('scan_all', {});

    //await trigger('scan', {"url": "http://www.theguardian.com", "articleSelector": ".fc-item__content", "headerSelector": ".fc-item__header", "sectionSelector": null, "sectionNameAttribute": null })
    //await trigger('scan', {"url": "http://www.cnn.com", "articleSelector": "article", "headerSelector": null, "sectionSelector": null, "sectionNameAttribute": null })
    //await trigger('scan', {"url": "http://www.washingtonpost.com", "articleSelector": ".headline", "headerSelector": null, "sectionSelector": ".chain-wrapper", "sectionNameAttribute": "data-chain-name" })
    //await trigger('scan', {"url": "http://www.nytimes.com", "articleSelector": "article", "headerSelector": ".story-heading", "sectionSelector": "section", "sectionNameAttribute": "id" })
  });

  return function test() {
    return _ref.apply(this, arguments);
  };
})();

var _events = require('./events');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

console.log("Running tests");

process.on('unhandledRejection', r => console.log(r));

test();