'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scanPages = undefined;

let timeout = (() => {
  var _ref = _asyncToGenerator(function* (f, seconds) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        f().then(resolve).catch(reject);
      }, seconds);
    });
  });

  return function timeout(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

let scanPages = exports.scanPages = (() => {
  var _ref2 = _asyncToGenerator(function* (datas) {
    const chrome = yield launchChrome({
      flags: ['--no-sandbox', '--single-process', '--hide-scrollbars', '--disable-gpu', '--incognito', '--user-data-dir=/tmp/user-data', ' --data-path=/tmp/data-path', '--homedir=/tmp', '--disk-cache-dir=/tmp/cache-dir', '--no-zygote', '--enable-logging', '--v=99']
    });

    return new Promise(function (resolve, reject) {
      CDP((() => {
        var _ref3 = _asyncToGenerator(function* (client) {
          const Network = client.Network,
                Page = client.Page,
                Runtime = client.Runtime,
                DOM = client.DOM,
                Emulation = client.Emulation;


          const version = yield CDP.Version();
          console.log(version);

          yield Network.enable();
          yield Page.enable();
          yield DOM.enable();

          // Set up viewport resolution, etc.
          const deviceMetrics = {
            width: 1280,
            height: 720,
            deviceScaleFactor: 0,
            mobile: false,
            fitWindow: false
          };
          yield Emulation.setDeviceMetricsOverride(deviceMetrics);
          yield Emulation.setVisibleSize({ width: deviceMetrics.width, height: deviceMetrics.height });

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = datas[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              let data = _step.value;

              yield Page.navigate({ url: data.url });
              //await Page.loadEventFired()
              yield Page.domContentEventFired();
              yield timeout(_asyncToGenerator(function* () {
                const articlesExpression = "document.querySelectorAll('" + data.articleSelector + "')";
                const articles = [];
                let result = yield Runtime.evaluate({
                  expression: articlesExpression,
                  generatePreview: true
                });
                for (let i = 0; i < result.result.preview.properties.length; i++) {
                  const articleExpression = articlesExpression + "[" + i.toString() + "]";

                  const properties = {};
                  let result = yield Runtime.evaluate({
                    expression: articleExpression + ".getBoundingClientRect()",
                    generatePreview: true
                  });
                  var _iteratorNormalCompletion2 = true;
                  var _didIteratorError2 = false;
                  var _iteratorError2 = undefined;

                  try {
                    for (var _iterator2 = result.result.preview.properties[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                      const prop = _step2.value;

                      properties[prop.name] = parseInt(prop.value);
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

                  if (!properties.top) {
                    // it's not visible
                    continue;
                  }
                  properties.height = properties.bottom - properties.top;

                  result = yield Runtime.evaluate({
                    expression: articleExpression + ".getElementsByTagName('a')[0].getAttribute('href')",
                    generatePreview: true
                  });
                  let articleUrl = result.result.value;
                  if (!articleUrl) {
                    continue;
                  }
                  if (articleUrl.indexOf('http') === -1) {
                    articleUrl = data.url + articleUrl;
                  }
                  articleUrl = articleUrl.split('#')[0];
                  properties.url = articleUrl;

                  if (data.sectionSelector) {
                    const sectionExpression = articleExpression + ".closest('" + data.sectionSelector + "')";
                    result = yield Runtime.evaluate({
                      expression: sectionExpression,
                      generatePreview: true
                    });
                    properties.sectionEl = result.result.value;

                    result = yield Runtime.evaluate({
                      expression: sectionExpression + ".getAttribute('" + data.sectionNameAttribute + "')",
                      generatePreview: true
                    });
                    properties.section = result.result.value;
                  }

                  result = yield Runtime.evaluate({
                    expression: articleExpression + ".innerHTML",
                    generatePreview: true
                  });
                  properties.articleEl = result.result.value;

                  let headerExpression = articleExpression;
                  if (data.headerSelector) {
                    headerExpression = articleExpression + ".querySelectorAll('" + data.headerSelector + "')[0]";
                  }
                  result = yield Runtime.evaluate({
                    expression: headerExpression + ".innerHTML",
                    generatePreview: true
                  });
                  properties.headingEl = result.result.value;
                  properties.title = h2p(result.result.value);

                  result = yield Runtime.evaluate({
                    expression: "getComputedStyle(" + headerExpression + ").fontSize",
                    generatePreview: true
                  });
                  properties.fontSize = parseInt((result.result.value || "").replace("px", "").replace("em", "").replace("rem", ""));
                  properties.index = i;
                  articles.push(properties);
                }
                /*
                let screenshotData = null
                try {
                  result = await Page.captureScreenshot();
                  screenshotData = result.data
                } catch (err) {
                  console.log("Unable to get screenshot: " + err.toString())
                }
                */

                yield (0, _events.trigger)('scan_complete', {
                  url: data.url,
                  placements: articles,
                  screenshot: null
                });

                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                  for (var _iterator3 = articles.sort(function (a, b) {
                    return a.top - b.top;
                  })[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    let a = _step3.value;

                    console.log(JSON.stringify({
                      url: a.url,
                      title: a.title,
                      top: a.top,
                      fontSize: a.fontSize,
                      section: a.section
                    }));
                  }
                } catch (err) {
                  _didIteratorError3 = true;
                  _iteratorError3 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                      _iterator3.return();
                    }
                  } finally {
                    if (_didIteratorError3) {
                      throw _iteratorError3;
                    }
                  }
                }
              }), 300);
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

          client.close();
        });

        return function (_x4) {
          return _ref3.apply(this, arguments);
        };
      })());
    });
  });

  return function scanPages(_x3) {
    return _ref2.apply(this, arguments);
  };
})();

var _events = require('./events');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const launchChrome = require('@serverless-chrome/lambda');
const CDP = require('chrome-remote-interface');
const url = require('url');
var h2p = require('html2plaintext');