'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scanPage = undefined;

let scanPage = exports.scanPage = (() => {
  var _ref = _asyncToGenerator(function* (data) {
    const chrome = yield launchChrome({
      flags: ['--hide-scrollbars', '--disable-gpu']
    });
    const url = data.url;
    return new Promise(function (resolve, reject) {
      CDP((() => {
        var _ref2 = _asyncToGenerator(function* (client) {
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

          yield Page.navigate({ url });

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

          yield Page.loadEventFired();
          //await Page.domContentEventFired()
          setTimeout(_asyncToGenerator(function* () {
            try {
              const articlesExpression = "document.querySelectorAll('" + data.articleSelector + "')";
              const articles = [];
              const result = yield Runtime.evaluate({
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
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                  for (var _iterator = result.result.preview.properties[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    const prop = _step.value;

                    properties[prop.name] = parseInt(prop.value);
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
                  articleUrl = url + articleUrl;
                }
                articleUrl = articleUrl.split('#')[0];
                properties.url = articleUrl;

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
                properties.title = removeTags(result.result.value);

                result = yield Runtime.evaluate({
                  expression: "getComputedStyle(" + headerExpression + ").fontSize",
                  generatePreview: true
                });
                properties.fontSize = parseInt((result.result.value || "").replace("px", "").replace("em", "").replace("rem", ""));
                properties.index = i;
                articles.push(properties);
              }
              let screenshotData = null;
              try {
                result = yield Page.captureScreenshot();
                screenshotData = result.data;
              } catch (err) {
                console.log("Unable to get screenshot: " + err.toString());
              }

              client.close();
              yield (0, _events.trigger)('scan_complete', {
                url,
                placements: articles,
                screenshot: screenshotData
              });

              var _iteratorNormalCompletion2 = true;
              var _didIteratorError2 = false;
              var _iteratorError2 = undefined;

              try {
                for (var _iterator2 = articles.sort(function (a, b) {
                  return a.top - b.top;
                })[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  let a = _step2.value;

                  console.log(a.title + " (" + a.index + "): " + a.top + ", font: " + a.fontSize);
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

              resolve();
            } catch (err) {
              reject(err);
            }
          }), 300);
        });

        return function (_x2) {
          return _ref2.apply(this, arguments);
        };
      })());
    });
  });

  return function scanPage(_x) {
    return _ref.apply(this, arguments);
  };
})();

var _events = require('./events');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const launchChrome = require('@serverless-chrome/lambda');
const CDP = require('chrome-remote-interface');
const url = require('url');

function removeTags(txt) {
  if (!txt) {
    return '';
  }
  var rex = /(<([^>]+)>)/ig;
  return txt.replace(rex, "").replace("\n", "").trim();
}