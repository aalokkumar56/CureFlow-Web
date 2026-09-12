let activeRequests = 0

export const incrementGlobalLoader = () => {
  activeRequests++
}

export const decrementGlobalLoader = () => {
  activeRequests = Math.max(0, activeRequests - 1)
}

export const getGlobalLoaderCount = () => activeRequests