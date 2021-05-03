import tracer from 'tracer'

const loggerFactory = () => {
  return tracer.colorConsole()
}

export default loggerFactory
