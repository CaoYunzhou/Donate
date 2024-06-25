export default {
  async fetch(request, env) {
    return await handleRequest(request, env)
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname.split('/')
  const option = path[1]

  if (option === 'dork') {
    const gateway = path[2]
    return await googleDorkSearch(gateway, env.DB)
  } else if (option === 'check') {
    return await checkWebsites(env.DB)
  } else if (option === 'view') {
    return await viewCheckResults(env.DB)
  } else {
    return new Response('Invalid option. Please choose "dork/{gateway}", "check", or "view".', { status: 400 })
  }
}

async function googleDorkSearch(gateway, db) {
  const dorks = [
    'intext:"{}" intitle:"buy now"',
    'inurl:donate + intext:{}',
    'intext:"{}" intitle:"paid plan"',
    'intext:"{}" intitle:"buy membership"',
    'inurl:.com/donate + intext:{}',
    'intext:"{}" intitle:"add cart"',
    'intext:"{}" intitle:"membership"'
  ]

  const formattedDorks = dorks.map(dork => dork.replace('{}', gateway))
  const results = []

  for (const dork of formattedDorks) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(dork)}`
    const response = await fetch(searchUrl)
    const html = await response.text()
    const links = extractLinksFromHTML(html)
    results.push(...links)
  }

  // 将结果存储到D1数据库
  for (const url of results) {
    await db.prepare('INSERT INTO urls (url) VALUES (?)').bind(url).run()
  }

  return new Response('URLs have been saved to the database.', {
    headers: { 'content-type': 'text/plain' }
  })
}

function extractLinksFromHTML(html) {
  const regex = /<a href="\/url\?q=([^&]+)&/g
  const links = []
  let match
  while (match = regex.exec(html)) {
    links.push(decodeURIComponent(match[1]))
  }
  return links
}

async function checkWebsites(db) {
  try {
    const query = await db.prepare('SELECT url FROM urls').all()
    const sites = query.results.map(row => row.url)

    const paymentGateways = [
      'paypal', 'stripe', 'braintree', 'checkout.com', 'square', 
      'woocommerce', 'shopify', 'authorize.net', 'adyen', 'sagepay'
    ]

    const results = []

    for (const site of sites) {
      try {
        const response = await fetch(site)
        const html = await response.text()

        let gatewayFound = null
        for (const gateway of paymentGateways) {
          if (html.includes(gateway)) {
            gatewayFound = gateway
            break
          }
        }

        const gatewayMsg = gatewayFound ? `Gateway: ${gatewayFound}` : 'No gateway detected'
        const captchaMsg = html.includes('captcha') ? 'Captcha: Yes' : 'Captcha: No'
        const cloudflareMsg = response.headers.get('server') === 'cloudflare' ? 'Cloudflare: Yes' : 'Cloudflare: No'

        results.push({ url: site, gateway: gatewayMsg, captcha: captchaMsg, cloudflare: cloudflareMsg })

        // 将结果存储到check_results表格
        await db.prepare('INSERT INTO check_results (url, gateway, captcha, cloudflare) VALUES (?, ?, ?, ?)')
                .bind(site, gatewayMsg, captchaMsg, cloudflareMsg)
                .run()
      } catch (error) {
        results.push({ url: site, error: `Failed to access ${site}: ${error.message}` })
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { 'content-type': 'application/json' }
    })
  } catch (error) {
    console.log('Database error:', error.message)
    return new Response(`Database error: ${error.message}`, { status: 500 })
  }
}

async function viewCheckResults(db) {
  try {
    const query = await db.prepare('SELECT * FROM check_results ORDER BY timestamp DESC').all()
    const results = query.results

    return new Response(JSON.stringify(results), {
      headers: { 'content-type': 'application/json' }
    })
  } catch (error) {
    console.log('Database error:', error.message)
    return new Response(`Database error: ${error.message}`, { status: 500 })
  }
}
