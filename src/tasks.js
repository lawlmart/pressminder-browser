const launchChrome = require('@serverless-chrome/lambda')
const CDP = require('chrome-remote-interface')
const url = require('url')

import { trigger } from './events'

function removeTags(txt) {
  if (!txt) {
    return ''
  }
  var rex = /(<([^>]+)>)/ig;
  return txt.replace(rex , "").replace("\n", "").trim();
}

export async function scanPage(data) {
  const chrome = await launchChrome({
    flags: ['--hide-scrollbars', '--disable-gpu']
  })
  const url = data.url
  return new Promise((resolve, reject) => {
    CDP(async function(client) {
      CDP.Version()
      .then(version => {
        console.log(version)
      })

      // extract domains
      const {Network, Page, Runtime, DOM, Emulation} = client;
      // setup handlers

      // Set up viewport resolution, etc.
      const deviceMetrics = {
        width: 1280,
        height: 720,
        deviceScaleFactor: 0,
        mobile: false,
        fitWindow: false,
      };
      await Emulation.setDeviceMetricsOverride(deviceMetrics);
      await Emulation.setVisibleSize({width: deviceMetrics.width, height: deviceMetrics.height});
      
      Page.domContentEventFired(function() {
        setTimeout(async function() {
          try {
            const articlesExpression = "document.querySelectorAll('" + data.articleSelector + "')"
            const articles = []
            const result = await Runtime.evaluate({
              expression: articlesExpression,
              generatePreview: true
            })
            for (let i = 0; i < result.result.preview.properties.length; i++) {
              const articleExpression = articlesExpression + "[" + i.toString() + "]"
              const properties = {}
              let result = await Runtime.evaluate({
                expression: articleExpression + ".getBoundingClientRect()",
                generatePreview: true
              })
              for (const prop of result.result.preview.properties) {
                properties[prop.name] = parseInt(prop.value)
              }
              if (!properties.top) {
                // it's not visible
                continue
              }
              properties.height = properties.bottom - properties.top

              result = await Runtime.evaluate({
                expression: articleExpression + ".getElementsByTagName('a')[0].getAttribute('href')",
                generatePreview: true
              })
              let articleUrl = result.result.value
              if (!articleUrl) {
                continue
              }
              if (articleUrl.indexOf('http') === -1) {
                articleUrl = url + articleUrl 
              }
              articleUrl = articleUrl.split('#')[0]
              properties.url = articleUrl

              
              result = await Runtime.evaluate({
                expression: articleExpression + ".innerHTML",
                generatePreview: true
              })
              properties.articleEl = result.result.value

              let headerExpression = articleExpression
              if (data.headerSelector) {
                headerExpression = articleExpression + ".querySelectorAll('" + data.headerSelector + "')[0]"
              }
              result = await Runtime.evaluate({
                expression: headerExpression + ".innerHTML",
                generatePreview: true
              })
              properties.headingEl = result.result.value
              properties.title = removeTags(result.result.value)
              
              result = await Runtime.evaluate({
                expression: "getComputedStyle(" + headerExpression + ").fontSize",
                generatePreview: true
              })
              properties.fontSize = parseInt((result.result.value || "").replace("px", "").replace("em", "").replace("rem", ""))
              properties.index = i
              articles.push(properties)
            }   

            let screenshotData = null
            try {
              result = await Page.captureScreenshot();
              screenshotData = result.data
            } catch (err) {
              console.log("Unable to get screenshot: " + err.toString())
            }

            client.close();
            await trigger('scan_complete', {
              url,
              placements: articles,
              screenshot: screenshotData
            })

            for (let a of articles.sort(function(a, b) {
              return a.top - b.top
            })) {
              console.log(a.title + " (" + a.index + "): " + a.top + ", font: " + a.fontSize)
            }

            resolve()
            
          } catch (err) {
            reject(err)
          }
        }, 300)
      });
      // enable events then start!
      Promise.all([
          Network.enable(),
          Page.enable(),
          DOM.enable()
      ]).then(() => {
          Page.navigate({url: url});  
      }).catch((err) => {
          console.error(err);
      });
    })
  })
}