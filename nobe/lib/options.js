import { collapseSlashes, cwdURL } from './utils.js'

/**
 * @typedef {object} Options
 * @property {object} [map]
 * @property {string} [out]
 * @property {string} [url]
 * @property {object} [www]
 */

/** @type {Options} */
const defaultOptions = {
	map: {},
	out: 'out',
	url: undefined,
	www: {},
}

/**
 * Parse user provided options
 * @param {Options} [options]
 * @param {import('bun').Server} [server]
 * @returns {any}
 */
export const createOptions = (options, server) => {
	if (typeof options === 'object') {
		options = { ...defaultOptions, ...options }
	} else {
		options = defaultOptions
	}

	const map = new Map()

	if (typeof options.map === 'object') {
		for (const key in options.map) {
			const val = options.map[key]

			if (typeof val === 'number' || typeof val === 'string') {
				map.set(key, val)
			}
		}
	}

	let out

	if (typeof options.out === 'string') {
		try {
			const tryOut = new URL(collapseSlashes(`./${options.out}/`), cwdURL)

			if (tryOut.pathname.length > cwdURL.pathname.length) {
				out = tryOut
			} else {
				throw new Error(`options.out has to be inside cwd!`)
			}
		} catch {}
	} else {
		out = new URL(collapseSlashes(`./${defaultOptions.out}/`), cwdURL)
	}

	let url

	if (typeof options.url === 'string') {
		try {
			url = new URL(collapseSlashes(`${options.url}/`))
		} catch {
			if (server) {
				url = new URL(collapseSlashes(`${server.url}/${options.url}/`))
			}
		}
	} else if (server) {
		url = new URL(server.url)
	}

	const www = new Map()

	if (typeof options.www === 'object') {
		for (const globKey in options.www) {
			const func = options.www[globKey]

			if (typeof func === 'function') {
				const glob = new Bun.Glob(globKey)
				www.set(glob, func)
			}
		}
	}

	return { map, out, url, www }
}
