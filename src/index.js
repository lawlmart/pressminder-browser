import { parseEvents, executeEvents } from './events'

exports.handler = async function(event, context) {
  try {
    const actions = []
    const events = parseEvents(event)
    const names = Object.keys(events)
    for (const name of names) {
      const eventPayloads = events[name]
      console.log("Executing " + eventPayloads.length.toString() + " " + name + " events")
      actions.push(executeEvents(name, eventPayloads))
    }
    await Promise.all(actions)

    console.log("Handler finished")
    context.succeed();
  } catch (err) {
    console.log("Handler error: " + err)
    context.fail(err)
  }
}