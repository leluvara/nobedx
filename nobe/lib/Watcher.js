import { watch } from 'node:fs'

export class Watcher {
	static pathname = '/nobedx-live-reload'

	/**
	 * Add live reload script to page
	 */
	static rewriter = new HTMLRewriter().on('body', {
		element(element) {
			element.append(
				`<script>
				(() => {
					const sse = new EventSource('${Watcher.pathname}');
					sse.onmessage = () => { location.reload() }
					onbeforeunload = () => { sse.close() }
				})()
			</script>`,
				{ html: true }
			)
		},
	})

	/**
	 * Store connected clients
	 */
	#clients = new Set()

	/**
	 * Watch for file changes in `rootDirURL`
	 * @param {URL} rootDirURL
	 * @param {import('./Site.js').Site} site
	 */
	constructor(rootDirURL, site) {
		watch(rootDirURL, { recursive: true }, async () => {
			await site.update()

			for (const client of this.#clients) {
				client.enqueue('data: 1\n\n')
				client.close()
			}

			this.#clients.clear()
		})
	}

	/**
	 * Connect client to watcher
	 * @param {Request} req
	 * @returns {Response}
	 */
	connect(req) {
		const watcher = this

		const stream = new ReadableStream({
			start(controller) {
				watcher.#clients.add(controller)

				req.signal.onabort = () => {
					watcher.#clients.delete(controller)
				}
			},
		})

		return new Response(stream, {
			status: 200,
			headers: {
				'content-type': 'text/event-stream',
				'cache-control': 'no-cache',
				Connection: 'keep-alive',
			},
		})
	}
}
