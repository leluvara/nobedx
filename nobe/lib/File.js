const pageExtensions = ['.html', '.htm']
const hasher = new Bun.CryptoHasher('sha256')

/**
 * Split file base to `name` and `ext`
 * @param {string} base
 * @returns {any}
 */
const parseFileName = (base) => {
	const obj = { name: base, ext: '' }

	if (base.length === 1) {
		return obj
	}

	const dot = base.lastIndexOf('.')

	if (dot > 0) {
		obj.name = base.slice(0, dot)
		obj.ext = base.slice(dot)
	}

	return obj
}

export class File {
	/**
	 * Create a file object
	 * @param {string} base
	 * @param {string} path
	 * @param {string} dir
	 * @param {string} dirPath
	 * @param {URL} src
	 * @param {URL} url
	 */
	constructor(base, path, dir, dirPath, src, url) {
		this.id = url.pathname

		this.base = base
		const parts = parseFileName(base)
		this.name = parts.name
		this.ext = parts.ext

		this.path = path
		this.dir = dir
		this.dirPath = dirPath
		this.src = src
		this.bun = Bun.file(src)
		this.url = url
		this.done = false
		this.isPage = pageExtensions.includes(this.ext)
		this.hash = this.name.endsWith('.hash')

		this.setHref()

		this.www = null
	}

	setHref() {
		this.href = decodeURI(
			this.name === 'index' && this.isPage
				? this.url.pathname.slice(0, this.url.pathname.lastIndexOf('/') + 1)
				: this.url.pathname
		)
	}

	/**
	 * Write file into `outDirURL`
	 * @param {URL} outDirURL
	 * @param {any} [body]
	 */
	async write(outDirURL, body) {
		if (this.hash) {
			if (body === undefined) {
				body = await this.bun.arrayBuffer()
			}

			hasher.update(body)
			const hash = hasher.digest('hex').slice(52)

			this.name = this.name.slice(0, -4) + hash
			this.path = this.dirPath + this.name + this.ext
			this.url = new URL(this.name + this.ext, this.url)
			this.setHref()
		} else if (body === undefined) {
			body = this.bun
		}

		this.done = true
		const outFileURL = new URL(this.path, outDirURL)
		console.log(this.path.slice(2))
		await Bun.write(outFileURL, body, { createPath: true })
	}
}
