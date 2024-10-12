const html = { html: true }

/**
 * Create title
 * @param {string} str
 * @returns {string}
 */
const createTitle = (str) =>
	str.slice(0, 1).toUpperCase() + str.slice(1).replace('-', ' ')

/**
 * Rewrite html
 * @param {import('../../lib/File.js').File} file
 * @param {import('../../lib/Site.js').Site} site
 * @returns
 */
export const rewrite = async (file, site) => {
	const base = await Bun.file('nobe/src/base.html').text()

	const content = await file.bun.text()

	let title

	if (file.dir && file.name === 'index') {
		title = createTitle(file.dir)
	} else if (file.name === 'index') {
		title = 'Home'
	} else {
		title = createTitle(file.name)
	}

	const rewriter = new HTMLRewriter()
		.on('title', {
			element(element) {
				element.prepend(title)
			},
		})
		.on('nav', {
			element(element) {
				let nav = `<ul>\n`

				for (const file of site.files) {
					if (file.isPage && file.name === 'index' && !file.dir) {
						nav += `<li><a href="${file.href}">Home</a></li>\n`
						continue
					}

					if (file.isPage) {
						nav += `<li><a href="${file.href}">${createTitle(
							file.name === 'index' ? file.dir : file.name
						)}</a></li>\n`
					}
				}

				nav += `</ul>\n`

				element.setInnerContent(nav, html)
			},
		})
		.on('main', {
			element(element) {
				element.setInnerContent(content, html)
			},
		})

	return rewriter.transform(base)
}
