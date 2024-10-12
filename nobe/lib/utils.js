export const cwdURL = Bun.pathToFileURL(process.cwd())

if (cwdURL.pathname.endsWith('/') === false) {
	cwdURL.pathname += '/'
}

export const nobeURL = new URL('./nobe/', cwdURL)
export const wwwURL = new URL('./nobe/www/', cwdURL)

/**
 * Collapse multiple forward slashes into one
 * @param {string} str
 * @returns {string}
 */
export const collapseSlashes = (str) => str.replace(/\/+/g, '/')

/**
 * Log information about nobedx
 * @param {string} mode
 * @param {URL} out
 * @param {URL} url
 */
export const log = (mode, out, url) => {
	console.log('nobedx', mode)
	console.log('out:', out.href)
	console.log('url:', url.href)
}
