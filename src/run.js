import { trigger } from './events'
process.on('unhandledRejection', r => console.log(r));


async function run(command, payload) {
  await trigger(command, {}, true)
  
  //await trigger('scan', {"url": "http://www.theguardian.com", "articleSelector": ".fc-item__content", "headerSelector": ".fc-item__header", "sectionSelector": null, "sectionNameAttribute": null })
  //await trigger('scan', {"url": "http://www.cnn.com", "articleSelector": "article", "headerSelector": null, "sectionSelector": null, "sectionNameAttribute": null })
  //await trigger('scan', {"url": "http://www.washingtonpost.com", "articleSelector": ".headline", "headerSelector": null, "sectionSelector": ".chain-wrapper", "sectionNameAttribute": "data-chain-name" })
  //await trigger(command, payload)
}

let command = process.argv[2]
console.log("Running " + command)
run(command, {})