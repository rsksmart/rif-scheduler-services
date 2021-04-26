import tracer from 'tracer'

let loggerInstance: undefined | tracer.Tracer.Logger

const loggerFactory = () => {
  if (loggerInstance) {
    return loggerInstance
  }

  loggerInstance = tracer.colorConsole()

  return loggerInstance
}

export default loggerFactory
