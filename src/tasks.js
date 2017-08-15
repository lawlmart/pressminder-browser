const launchChrome = require('@serverless-chrome/lambda')
const CDP = require('chrome-remote-interface')
const url = require('url')
var h2p = require('html2plaintext')

import { trigger } from './events'

async function timeout(f, seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      f()
      .then(resolve)
      .catch(reject)
    }, seconds)
  })
}

export async function scanPages(datas) {
  const chrome = await launchChrome({
    flags: ['--no-sandbox', '--single-process', '--hide-scrollbars', '--disable-gpu', '--incognito', '--user-data-dir=/tmp/user-data',  ' --data-path=/tmp/data-path' , '--homedir=/tmp' , '--disk-cache-dir=/tmp/cache-dir', '--no-zygote', '--enable-logging',  '--v=99']
  })

  return new Promise((resolve, reject) => {
    CDP(async function(client) {
      const {Network, Page, Runtime, DOM, Emulation} = client;

      const version = await CDP.Version()
      console.log(version)

      await Network.enable()
      await Page.enable()
      await DOM.enable()

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
      
      for (let data of datas) {
        await Page.navigate({url: data.url})
        //await Page.loadEventFired()
        await Page.domContentEventFired()
        await timeout(async function() {
          const articlesExpression = "document.querySelectorAll('" + data.articleSelector + "')"
          const articles = []
          let result = await Runtime.evaluate({
            expression: articlesExpression,
            generatePreview: true
          })
          if (!result.result.preview) {
            console.log("No results found for " + articlesExpression + " " + result.result.preview)
            return
          }
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
              articleUrl = data.url + articleUrl 
            }
            articleUrl = articleUrl.split('#')[0]
            properties.url = articleUrl

            if (data.sectionSelector) {
              const sectionExpression = articleExpression + ".closest('" + data.sectionSelector +  "')"
              result = await Runtime.evaluate({
                expression: sectionExpression,
                generatePreview: true
              })
              properties.sectionEl = result.result.value
  
              result = await Runtime.evaluate({
                expression: sectionExpression + ".getAttribute('" + data.sectionNameAttribute + "')",
                generatePreview: true
              })
              properties.section = result.result.value
            }
            
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
            properties.title = h2p(result.result.value)
            
            result = await Runtime.evaluate({
              expression: "getComputedStyle(" + headerExpression + ").fontSize",
              generatePreview: true
            })
            properties.fontSize = parseInt((result.result.value || "").replace("px", "").replace("em", "").replace("rem", ""))
            properties.index = i
            articles.push(properties)
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

          await trigger('scan_complete', {
            url: data.url,
            placements: articles,
            screenshot: null
          })

          for (let a of articles.sort(function(a, b) {
            return a.top - b.top
          })) {
            console.log(JSON.stringify({
              url: a.url,
              title: a.title,
              top: a.top,
              fontSize: a.fontSize,
              section: a.section
            }))
          }
        }, 300)
      }
      client.close();
    })
  })
}