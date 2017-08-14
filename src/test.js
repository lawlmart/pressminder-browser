import { trigger } from './events'
console.log("Running tests")

process.on('unhandledRejection', r => console.log(r));

trigger('scan', {"url": "http://www.nytimes.com", "articleSelector": "article", "headerSelector": ".story-heading", "sectionSelector": "section" })
.then(() => {
  console.log("Finished scanning")
})
.catch(err => console.log(err))