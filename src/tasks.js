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
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        reject(err)
      } if (data) {
        resolve()
        console.log("Saved " + file)
      }
    });
  })
}

function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds + 1000));
}

async function scan(browser, data) {
  const platform = data.platform
  console.log("Scanning " + data.url + " on " + JSON.stringify(platform))
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
    height: platform.height,
    width: platform.width
  })
  //await page.setUserAgent(platform.userAgent)
  page.goto(data.url)
  .catch(err => console.log(err))
  await sleep(3)

  const timestamp = Math.round(Date.now() / 1000)
  const screenshotName = path.join(__dirname, "../screenshots/" + data.name + "-" + (platform.name || "desktop") + "-" + timestamp.toString() + ".png")
  await page.screenshot({path: screenshotName})
  await upload(screenshotName)

  data.platform = platform.name
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
          platform: data.platform,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          height: Math.round(rect.bottom - rect.top),
          width: Math.round(rect.right - rect.left)
        }
        const anchorEl = el.getElementsByTagName('a')[0]
        properties.url = anchorEl.getAttribute('href')
        if (!properties.url) {
          continue
        }

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
        return err.toString()
      }
    }
    return results
  }, data)
  if (typeof articles == "string") {
    console.log("ERROR: " + articles)
    return []
  }
  for (let properties of articles) {
    properties.title = h2p(properties.headingEl)
    
    if (properties.url.indexOf('http') === -1) {
      const hostname = url.parse(data.url).hostname
      properties.url = 'http://' + hostname + properties.url 
    }
    properties.url = properties.url.split('#')[0]
  }

  await trigger('scan_complete', {
    url: data.url,
    placements: articles,
    screenshot: screenshotName
  })
  /*
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
  */
  return articles
}

export async function scanPages(datas) {
  console.log("Scanning pages " + JSON.stringify(datas))
  const browser = await puppeteer.launch();
  for (const data of datas) {
    const articles = await scan(browser, data)
    console.log("Found " + articles.length + " articles on " + data.platform + " " + data.url)
  }
  browser.close();
}