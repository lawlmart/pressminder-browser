const CDP = require('chrome-remote-interface')
const url = require('url')
const h2p = require('html2plaintext')
const AWS = require('aws-sdk');
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path');

import { trigger } from './events'

const s3 = new AWS.S3();

async function upload(file) {
  return new Promise((resolve, reject) => {
    // call S3 to retrieve upload file to specified bucket
    var uploadParams = {Bucket: 'pressminder', Key: '', Body: '', ACL: 'public-read'};
    var fileStream = fs.createReadStream(file);
    fileStream.on('error', function(err) {
      reject(err)
    });
    uploadParams.Body = fileStream;
    uploadParams.Key = path.basename(file);

    // call S3 to retrieve upload file to specified bucket
    s3.upload (uploadParams, function (err, data) {
      if (err) {
        reject(err)
      } if (data) {
        resolve()
        console.log("Saved " + file)
      }
    });
  })
}

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
      if (!data.allowJavascript && url.indexOf('js') !== -1) {
        interceptedRequest.abort()
        return
      }
      interceptedRequest.continue()
    });
    await page.setViewport({
      height: 800,
      width: 1280
    })
    await page.goto(data.url);
    await timeout(async function() {
      const timestamp = Math.round(Date.now() / 1000)
      const screenshotName = "screenshots/" + data.name + "-" + timestamp.toString() + ".png"
      await page.screenshot({path: screenshotName})
      await upload(screenshotName)
    
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
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              height: Math.round(rect.bottom - rect.top),
              width: Math.round(rect.right - rect.left)
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
    }, 3000)
  }
  browser.close();
}