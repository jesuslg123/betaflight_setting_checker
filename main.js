const { ReadlineParser } = require('@serialport/parser-readline')
const { SerialPort } = require('serialport')
const settings = require('./settings.json')

const required = "="
const forbidden = "!="

console.log("Settings loaded:")
console.dir(settings)



const port = new SerialPort({
  path: '/dev/tty.usbmodem0x80000001',
  baudRate: 115200,
  autoOpen: false
})

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))

port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message)
  }

  // Because there's no callback to write, write errors will be emitted on the port:
})

// The open event is always emitted
port.on('open', function() {
  console.log('Connection open')

  main()
})

port.on('error', function(err) {
  console.log('Error: ', err.message)
})

function writeMessage(message) {
  return new Promise((resolve, reject) => {
    // Send the message
    let response = ""
    let timeout
    console.log(`Write message: ${message}`)
    port.write(message, (err) => {
      if (err) {
        reject(err);
      }
    });

    // Listen for incoming data
    parser.on('data', (data) => {
      response += data + "\r\n"
      clearTimeout(timeout)

      timeout = setTimeout(() => {
        resolve(response);
      }, 100)

    });
  });
}

async function main() {
  const response = await writeMessage('#')
  console.log(response)
  // const version = await writeMessage('version\n')
  // console.log(version)

  // const crashRecovery = await writeMessage('get crash_recovery\n')
  // console.log(crashRecovery)
  // const failSafe = await writeMessage('get failsafe_procedure\n')
  // console.log(failSafe)

  const settings_validation = await processSettings()
  console.dir(settings_validation)
}

async function processSettings() {
  let results = []

  for (const setting of settings) {
    let setting_result = await processSetting(setting)
    results.push(setting_result)
  }

  return results
}

async function processSetting(setting) {
  const setting_name = setting["name"]
  // console.log(`Process ${setting_name}: ${setting}`)
  const information = await writeMessage(`get ${setting_name}\n`)
  // console.log(`Respose: ${information}`)
  const currentValue = readValueFromResponse(setting_name, information)

  const action = setting['action']
  const value = setting['value']
  const values = setting['values']

  // console.dir(currentValue)


  let result = validateSetting(setting, currentValue)

  // console.log(`Setting ${setting_name} is ${currentValue}: ${result}`)

  data = {
    setting: setting_name,
    valid: result,
    current: currentValue,
  }

  if (action === required) {
    data["required"] = value || values
  } else {
    data["forbidden"] = value || values
  }

  return data
}

function readValueFromResponse(setting_name, setting) {
  const regex = new RegExp(`${setting_name}\\s=\\s(\\w+)`);
  const match = setting.match(regex);

  if (match) {
    const value = match[1];
    return value
  } else {
    return undefined
  }
}



function validateSetting(setting, currentValue) {
  const { action, value, values } = setting;

  if (action === required) {
    if (value !== undefined) {
      return currentValue == value;
    }

    if (values !== undefined) {
      return values.includes(currentValue);
    }
  } else if (action === forbidden) {
    if (value !== undefined) {
      return currentValue != value;
    }

    if (values !== undefined) {
      return !values.includes(currentValue);
    }
  } else {
    throw new Error(`Invalid action '${action}' for setting '${key}'`);
  }
  console.error(`Setting not evaluated: ${setting}`)
  return false
}
