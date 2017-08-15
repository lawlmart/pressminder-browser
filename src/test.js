import { trigger } from './events'
console.log("Running tests")

process.on('unhandledRejection', r => console.log(r));


async function test() {
  //await trigger('scan_all', {})
  
  //await trigger('scan', {"url": "http://www.theguardian.com", "articleSelector": ".fc-item__content", "headerSelector": ".fc-item__header", "sectionSelector": null, "sectionNameAttribute": null })
  //await trigger('scan', {"url": "http://www.cnn.com", "articleSelector": "article", "headerSelector": null, "sectionSelector": null, "sectionNameAttribute": null })
  //await trigger('scan', {"url": "http://www.washingtonpost.com", "articleSelector": ".headline", "headerSelector": null, "sectionSelector": ".chain-wrapper", "sectionNameAttribute": "data-chain-name" })
  await trigger('scan', {"url": "http://www.nytimes.com", "articleSelector": "article", "headerSelector": ".story-heading", "sectionSelector": "section", "sectionNameAttribute": "id" })
}

test()