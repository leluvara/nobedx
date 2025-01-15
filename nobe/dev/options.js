import { rewrite } from './options/rewrite.js'

/**
 * Return string
 * @param {import('../lib/File.js').File} file
 * @returns {Promise<string>}
 */
const text = async (file) => await file.bun.text()

export const serve = {
	map: {
		variable: 'serve[variable]',
	},
	url: 'nobedx',
	www: {
		'**/*.html': rewrite,
		'**/*.js': text,
		'**/*.css': text,
	},
}

export const write = {
	map: {
		variable: 'write[variable]',
	},
	url: 'https://leluvara.github.io/nobedx',
	www: {
		'**/*.html': rewrite,
		'**/*.js': text,
		'**/*.css': text,
	},
}

export const preview = {
	url: 'nobedx',
}
