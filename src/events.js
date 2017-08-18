import kinesis from '@heroku/kinesis'
import * as tasks from './tasks'
const fs = require('fs');
const path = require('path');

const sendToStream = (stream, type, payload) => {
  return new Promise((resolve, reject) => {
    const base64data = new Buffer(
      JSON.stringify({
        type,
        payload
      })
    ).toString('base64')
    const params = {
      Records: [{
        Data: base64data,
        PartitionKey: Math.random().toString()
      }],
      StreamName: stream
    };

    kinesis.request('PutRecords', params, { logger: { log: function (m) { } } }, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject()
        return
      }
      resolve()
    });
  })
}

export function parseEvents(event) {
  const events = {}

  function addEvent(name, payload) {
    payload = payload || {}
    if (name in events) {
      events[name].push(payload)
    } else {
      events[name] = [payload]
    }
  }
  if ('Records' in event) {
    const promises = []
    for (let record of event['Records']) {
      if ('kinesis' in record) {
        let string = Buffer.from(record['kinesis']['data'], 'base64').toString("utf8")
        let data = JSON.parse(string)
        addEvent(data.type, data.payload)
      } else {
        throw "Found unrecognized record type: " + JSON.stringify(record)
      }
    }
  } else if ('type' in event) {
    addEvent(event.type, event.payload)
  } else {
    throw "No records found in event"
  }
  return events
}


function makeMulti(f) {
  return async (inputs) => {
    const promises = []
    for (const input of inputs) {
      promises.push(f(input))
    }
    return Promise.all(promises)
  }
}

export async function executeEvents(name, payloads) {
  let f
  if (name == 'scan') {
    f = tasks.scanPages
  } else if (name == 'scan_all') {
    f = runSourceFile
  } else {
    console.log("Unrecognized event " + name)
    return
  }
  return f(payloads)
}

export async function trigger(name, data, now) {
  if (process.env.NODE_ENV == 'production' && !now) {
    return await sendToStream('pressminder', name, data)
  } else {
    console.log("Executing event " + name + " immediately")
    return await executeEvents(name, [data]);
  }
}

async function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) throw err; // we'll not consider error handling for now
      resolve(JSON.parse(data))
    });
  })
}

export async function runSourceFile() {
  const sources = await readJsonFile(path.resolve(__dirname, 'sources.json'))
  return await executeEvents('scan', sources);
}