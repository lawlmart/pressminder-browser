const CDP = require('chrome-remote-interface')
const url = require('url')
const h2p = require('html2plaintext')
const puppeteer = require('puppeteer');

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
  console.log("Scanning pages " + JSON.stringify(datas))
  const browser = await puppeteer.launch();
  for (const data of datas) {
    const page = await browser.newPage();
    await page.setRequestInterceptionEnabled(true);
    page.on('request', interceptedRequest => {
      let { url } = interceptedRequest
      if (url.indexOf('js') !== -1) {
        interceptedRequest.abort()
        return
      }
      if (url.indexOf('png') !== -1) {
        interceptedRequest.abort()
        return
      }
      if (url.indexOf('jgeg') !== -1) {
        interceptedRequest.abort()
        return
      }
      if (url.indexOf('jpg') !== -1) {
        interceptedRequest.abort()
        return
      }
      if (url.indexOf('gif') !== -1) {
        interceptedRequest.abort()
        return
      }
      interceptedRequest.continue()
    });
    await page.goto(data.url);
    await timeout(async function() {
      let articles = await page.evaluate((data) => {
        let results = []
        let index = 0
        for (const el of document.querySelectorAll(data.articleSelector)) {
          try {
            let rect = el.getBoundingClientRect()
            if (!rect.top) {
              continue
            }
            let properties = {
              top: rect.top,
              left: rect.left,
              height: rect.bottom - rect.top,
              width: rect.right - rect.left
            }
            const anchorEl = el.getElementsByTagName('a')[0]
            let articleUrl = anchorEl.getAttribute('href')
            if (articleUrl.indexOf('http') === -1) {
              articleUrl = data.url + articleUrl 
            }
            articleUrl = articleUrl.split('#')[0]
            properties.url = articleUrl

            properties.articleEl = el.innerHTML

            if (data.sectionSelector) {
              const sectionEl = el.closest(data.sectionSelector)
              properties.sectionEl = sectionEl
              properties.section = sectionEl.getAttribute(data.sectionNameAttribute)
            }

            let headerEl = el
            if (data.headerSelector) {
              headerEl = el.querySelectorAll(data.headerSelector)[0]
            }
            properties.headingEl = headerEl.innerHTML
            
            let fontSizeString = getComputedStyle(headerEl).fontSize
            properties.fontSize = parseInt((fontSizeString || "").replace("px", "").replace("em", "").replace("rem", ""))
            properties.index = index
            
            results.push(properties)
            index += 1
          } catch (err) {
            console.log(err)
          }
        }
        return results
      }, data)
      for (let properties of articles) {
        properties.title = h2p(properties.headingEl)
      }

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
  browser.close();
}