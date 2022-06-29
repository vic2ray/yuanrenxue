import https from 'node:https'



function getCookie() {
    return new Promise((resolve) => {
        const options = {
            host: 'match.yuanrenxue.com',
            port: 443,
            path: '/match/13',
            method: 'get',
            headers: {
                'cookie': 'sessionid=egmh5yelvozhcfk5bzp4apqm0bggm0gg',
                'user-agent': 'yuanrenxue.project',
            },
        }
        https.request(options, (res) => {
            let sessionid = res.headers['set-cookie'][0].match(/sessionid=.*?;/)[0]
            let rawData = ''
            res.on('data', (chunck) => rawData += chunck)
            res.on('end', () => {
                // console.log(rawData)
                let cookie = ''
                const matches = rawData.matchAll(/(?<=').(?=')/g)
                for (const match of matches) {
                    cookie += match[0]
                }
                console.log('Get Cookie', sessionid + cookie)
                resolve(sessionid + cookie)
            })
        }).end()
    })
}

function getData(page, cookie) {
    return new Promise((resolve) => {
        const options = {
            host: 'match.yuanrenxue.com',
            port: 443,
            method: 'get',
            headers: {
                'Host': 'match.yuanrenxue.com',
                'Cookie': cookie,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'yuanrenxue.project',
            },
            path: `/api/match/13?page=${page}`
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
    const cookie = await getCookie()
    for (let page = 1; page <= pages; page++) {
        const data = await getData(page, cookie)
        sum += data.map(x => x.value).reduce((x, y) => x + y)
    }
    console.log('Total sum', sum)
}

getAllData(5)