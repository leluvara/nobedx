const workerURL = new URL('nobe[worker.hash.js]', import.meta.url)
console.log('Worker URL:', workerURL.href)

new Worker(workerURL)
