import { rm } from 'node:fs/promises'
import { createOptions } from './options.js'
import { Site } from './Site.js'
import { log, wwwURL } from './utils.js'

/**
 * Write site files to disk
 * @param {import('./options.js').Options} [options]
 */
export const write = async (options) => {
	const mode = 'write'

	const { out, url, www } = createOptions(options)

	if (!url) {
		throw new Error(
			`Writing failed! options.url is required when writing a site.`
		)
	}

	log(mode, out, url)

	const site = new Site(mode, wwwURL, url, www)

	// update site
	await site.update()

	// remove old out dir
	await rm(out, { recursive: true, force: true })

	console.log('')

	for (const file of site.files) {
		if (file.www) {
			let body = await file.www(file, site)

			if (typeof body === 'string') {
				body = site.resolveNobe(file, body)

				// if file depends on another undone file then skip writing
				if (site.queue.has(file)) {
					continue
				}
			}

			await file.write(out, body)
		} else {
			await file.write(out)
		}
	}

	console.log('')

	let previousQueueSize

	// write interdependent files in the right order
	while (site.queue.size > 0) {
		previousQueueSize = site.queue.size

		// copy the queue in order to be able to delete in a loop
		const queue = Array.from(site.queue)

		for (const file of queue) {
			site.queue.delete(file)

			let body = await file.www(file, site)

			body = site.resolveNobe(file, body)

			if (site.queue.has(file)) {
				continue
			}

			await file.write(out, body)
		}

		if (previousQueueSize === site.queue.size) {
			throw new Error(`Writing halted! Detected circular dependency.`)
		}
	}
}
