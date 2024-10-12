import { readdir, stat } from 'fs/promises'
import { File } from './File.js'
import { collapseSlashes } from './utils.js'

const excludedFiles = ['.DS_Store']

export class Site {
	/**
	 *
	 * @param {string} mode
	 * @param {URL} rootDirURL
	 * @param {URL} url
	 * @param {Map<import('bun').Glob, function>} www
	 */
	constructor(mode, rootDirURL, url, www) {
		this.mode = mode
		this.rootDirURL = rootDirURL
		this.url = url
		this.www = www

		this.isWalking = false

		/** @type {object[]} */
		this.directories = []

		/** @type {File[]} */
		this.files = []

		this.queue = new Set()
	}

	async update() {
		this.queue.clear()
		this.directories.length = 0
		this.files.length = 0

		if (this.isWalking === false) {
			this.isWalking = true
			const directory = await this.walk()
			this.directories.unshift(directory)
			this.isWalking = false
		}
	}

	/**
	 * Walk `www` directory
	 * @param  {...string} dirPathComponents Dir path components
	 * @returns {Promise<object>}
	 */
	async walk(...dirPathComponents) {
		/** @type {object[]} */
		const children = []

		const dirPath = collapseSlashes(`./${dirPathComponents.join('/')}/`)
		const dirURL = new URL(dirPath, this.rootDirURL)
		const dir = dirPathComponents.length
			? dirPathComponents[dirPathComponents.length - 1]
			: ''

		const fileNames = await readdir(dirURL)

		for (const fileName of fileNames) {
			if (excludedFiles.includes(fileName)) {
				continue
			}

			const filePath = dirPath + fileName
			const fileURL = new URL(filePath, this.rootDirURL)
			const stats = await stat(fileURL)

			if (stats.isDirectory()) {
				const directory = await this.walk(...dirPathComponents, fileName)

				children.push(directory)
				this.directories.push(directory)
			} else {
				const url = new URL(filePath, this.url)

				const file = new File(fileName, filePath, dir, dirPath, fileURL, url)

				file.done = this.mode !== 'write'

				for (const [glob, func] of this.www) {
					if (glob.match(filePath.slice(2))) {
						file.www = func
					}
				}

				children.push(file)
				this.files.push(file)
			}
		}

		return {
			src: dirURL,
			url: new URL(dirPath, this.url),
			children,
		}
	}

	/**
	 * Get index file from directory
	 * @param {string} pathname
	 * @returns {File | undefined}
	 */
	getIndexFile(pathname) {
		for (const directory of this.directories) {
			if (directory.url.pathname === pathname) {
				for (const child of directory.children) {
					if (child.name === 'index' && child.isPage) {
						return child
					}
				}
			}
		}
	}

	/**
	 * Get file
	 * @param {string} pathname
	 * @returns {File | undefined}
	 */
	getFile(pathname) {
		for (const file of this.files) {
			if (file.id === pathname) {
				return file
			}
		}
	}

	/**
	 * Resolve and replace `nobe[]` occurrences
	 * @param {File} file
	 * @param {string} body
	 * @returns {string}
	 */
	resolveNobe(file, body) {
		return body.replace(/nobe\[(.*?)\]/g, (match, group) => {
			if (group.startsWith('#')) {
				const hash = group.slice(1)

				if (file.hash) {
					console.warn(
						`Warning: a file with its hash in its name can not reference itself!`
					)
					return match
				} else if (hash in file.url) {
					return decodeURI(file.url[hash])
				}

				return match
			}

			try {
				const url = new URL(group, file.url)

				if (url.pathname.startsWith(this.url.pathname) === false) {
					url.pathname = collapseSlashes(this.url.pathname + url.pathname)
				}

				let targetFile, byIndex

				if (url.pathname.endsWith('/')) {
					targetFile = this.getIndexFile(url.pathname)
					byIndex = true
				} else {
					targetFile = this.getFile(url.pathname)
				}

				if (!targetFile) {
					targetFile = this.getIndexFile(url.pathname + '/')
					byIndex = true
				}

				if (targetFile) {
					if (targetFile === file && file.hash) {
						console.warn(
							`Warning: a file with its hash in its name can not reference itself!`
						)
						return match
					}

					if (targetFile.hash && targetFile.done === false) {
						this.queue.add(file)
						return match
					}

					if (url.hash) {
						const hash = url.hash.slice(1)

						if (hash in targetFile.url) {
							return decodeURI(targetFile.url[hash])
						}
					} else if (group.startsWith('/')) {
						return targetFile.href
					} else {
						const lastIndexOfSlash = group.lastIndexOf('/')

						if (lastIndexOfSlash) {
							const path = group.slice(0, lastIndexOfSlash + 1)

							if (byIndex) {
								return path
							} else {
								return path + targetFile.name + targetFile.ext
							}
						} else {
							return targetFile.name + targetFile.ext
						}
					}
				}
			} catch {}

			return match
		})
	}
}
