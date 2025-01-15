import { createOptions } from './options.js'
import { Site } from './Site.js'
import { collapseSlashes, log } from './utils.js'
import { Watcher } from './Watcher.js'

/**
 * Start preview server
 * @param {import('./options.js').Options} [options]
 * @param {import('bun').ServeOptions} [serveOptions]
 * @returns {Promise<import('bun').Server>}
 */
export const preview = async (options, serveOptions) => {
	const mode = 'preview'

	const server = Bun.serve({
		...serveOptions,
		async fetch(req) {
			const url = new URL(req.url)
			const pathname = collapseSlashes(url.pathname)

			let file

			if (pathname.endsWith('/')) {
				file = site.getIndexFile(pathname)
			} else {
				file = site.getFile(pathname)
			}

			if (file) {
				// redirect in case of multiple consecutive forward slashes in pathname
				if (pathname !== url.pathname) {
					return Response.redirect(pathname, 301)
				}

				return new Response(file.bun)
			} else {
				file = site.getIndexFile(pathname + '/')

				if (file) {
					return Response.redirect(pathname + '/', 301)
				}
			}

			return new Response('404', { status: 404 })
		},
		error(req) {
			return new Response(req.message, { status: 404 })
		},
	})

	const { out, url, www, map } = createOptions(options, server)
	const site = new Site(mode, out, url, www, map)
	await site.update()

	new Watcher(out, site)

	log(mode, out, url)

	return server
}
