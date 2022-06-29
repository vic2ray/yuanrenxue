import https from 'node:https'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function getData(page) {
    return new Promise((resolve) => {
        const options = {
            host: 'match.yuanrenxue.com',
            port: 443,
            method: 'get',
            headers: {
                'Host': 'match.yuanrenxue.com',
                'Cookie': 'sessionid=egmh5yelvozhcfk5bzp4apqm0bggm0gg',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'yuanrenxue.project',
            },
            path: `/api/match/17?page=${page}`
        }
        https.request(options, (res) => {
            // console.log(options)
            res.on('data', (data) => {
                // console.log(Buffer.from(data).toString())
                const jsonData = JSON.parse(Buffer.from(data).toString())
                console.log(`Get page ${page} data ${jsonData.state}`)
                resolve(jsonData.data)
            })
        }).end()
    })
}

let sum = 0
async function getAllData(pages) {
    for (let page = 1; page <= pages; page++) {
        const data = await getData(page)
        sum += data.map(x => x.value).reduce((x, y) => x + y)
    }
    console.log('Total sum', sum)
}

getAllData(5)