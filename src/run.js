import { trigger } from './events'
process.on('unhandledRejection', r => console.log(r));


async function run(command, payload) {
  await trigger(command, {}, true)
}

let command = process.argv[2]
console.log("Running " + command)
run(command, {})