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
    console.log("Scanning pages " + JSON.stringify(datas));
    const browser = yield puppeteer.launch();
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = datas[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        const data = _step.value;

        const page = yield browser.newPage();
        yield page.setRequestInterceptionEnabled(true);
        page.on('request', function (interceptedRequest) {
          let url = interceptedRequest.url;

          if (url.indexOf('js') !== -1) {
            interceptedRequest.abort();
            return;
          }
          if (url.indexOf('png') !== -1) {
            interceptedRequest.abort();
            return;
          }
          if (url.indexOf('jgeg') !== -1) {
            interceptedRequest.abort();
            return;
          }
          if (url.indexOf('jpg') !== -1) {
            interceptedRequest.abort();
            return;
          }
          if (url.indexOf('gif') !== -1) {
            interceptedRequest.abort();
            return;
          }
          interceptedRequest.continue();
        });
        yield page.goto(data.url);
        yield timeout(_asyncToGenerator(function* () {
          let articles = yield page.evaluate(function (data) {
            let results = [];
            let index = 0;
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = document.querySelectorAll(data.articleSelector)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                const el = _step2.value;

                try {
                  let rect = el.getBoundingClientRect();
                  if (!rect.top) {
                    continue;
                  }
                  let properties = {
                    top: Math.round(rect.top),
                    left: Math.round(rect.left),
                    height: Math.round(rect.bottom - rect.top),
                    width: Math.round(rect.right - rect.left)
                  };
                  const anchorEl = el.getElementsByTagName('a')[0];
                  let articleUrl = anchorEl.getAttribute('href');
                  if (articleUrl.indexOf('http') === -1) {
                    articleUrl = data.url + articleUrl;
                  }
                  articleUrl = articleUrl.split('#')[0];
                  properties.url = articleUrl;

                  properties.articleEl = el.innerHTML;

                  if (data.sectionSelector) {
                    const sectionEl = el.closest(data.sectionSelector);
                    properties.sectionEl = sectionEl;
                    properties.section = sectionEl.getAttribute(data.sectionNameAttribute);
                  }

                  let headerEl = el;
                  if (data.headerSelector) {
                    headerEl = el.querySelectorAll(data.headerSelector)[0];
                  }
                  properties.headingEl = headerEl.innerHTML;

                  let fontSizeString = getComputedStyle(headerEl).fontSize;
                  properties.fontSize = parseInt((fontSizeString || "").replace("px", "").replace("em", "").replace("rem", ""));
                  properties.index = index;

                  results.push(properties);
                  index += 1;
                } catch (err) {
                  console.log(err);
                }
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

            return results;
          }, data);
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = articles[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              let properties = _step3.value;

              properties.title = h2p(properties.headingEl);
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

          yield (0, _events.trigger)('scan_complete', {
            url: data.url,
            placements: articles,
            screenshot: null
          });

          var _iteratorNormalCompletion4 = true;
          var _didIteratorError4 = false;
          var _iteratorError4 = undefined;

          try {
            for (var _iterator4 = articles.sort(function (a, b) {
              return a.top - b.top;
            })[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              let a = _step4.value;

              console.log(JSON.stringify({
                url: a.url,
                title: a.title,
                top: a.top,
                fontSize: a.fontSize,
                section: a.section
              }));
            }
          } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
              }
            } finally {
              if (_didIteratorError4) {
                throw _iteratorError4;
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

    browser.close();
  });

  return function scanPages(_x3) {
    return _ref2.apply(this, arguments);
  };
})();

var _events = require('./events');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const CDP = require('chrome-remote-interface');
const url = require('url');
const h2p = require('html2plaintext');
const puppeteer = require('puppeteer');