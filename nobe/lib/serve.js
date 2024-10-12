import { createOptions } from './options.js'
import { Site } from './Site.js'
import { collapseSlashes, cwdURL, log, nobeURL, wwwURL } from './utils.js'
import { Watcher } from './Watcher.js'

/**
 * Start development server
 * @param {import('./options.js').Options} [options]
 * @returns {Promise<import('bun').Server>}
 */
export const serve = async (options) => {
	const mode = 'serve'

	const server = Bun.serve({
		idleTimeout: 0,
		async fetch(req) {
			const url = new URL(req.url)
			const pathname = collapseSlashes(url.pathname)

			// connect to server sent events for live reloading
			if (pathname === Watcher.pathname) {
				return watcher.connect(req)
			}

			let file

			if (pathname.endsWith('/')) {
				file = site.getIndexFile(pathname)
			} else {
				file = site.getFile(pathname)
			}

			if (file) {
				// redirect in case of multiple consecutive forwards slashes in pathname
				if (pathname !== url.pathname) {
					return Response.redirect(pathname, 301)
				}

				if (file.www) {
					let body, type

					try {
						body = await file.www(file, site)
						type = file.bun.type

						if (typeof body === 'string') {
							body = site.resolveNobe(file, body)

							// add live reload script to page
							if (file.isPage) {
								body = Watcher.rewriter.transform(body)
							}
						}
					} catch (err) {
						body = err.message
						type = 'text/plain;charset=utf-8'
					}

					return new Response(body, {
						headers: {
							'content-type': type,
						},
					})
				} else {
					return new Response(file.bun)
				}
			} else {
				file = site.getIndexFile(pathname + '/')

				if (file) {
					return Response.redirect(pathname + '/', 301)
				}
			}

			return new Response(Bun.file(new URL(pathname.slice(1), cwdURL)))
		},
		error(req) {
			return new Response(req.message, { status: 404 })
		},
	})

	const { out, url, www } = createOptions(options, server)

	const site = new Site(mode, wwwURL, url, www)
	await site.update()

	const watcher = new Watcher(nobeURL, site)

	log(mode, out, url)

	return server
}
