import https from 'node:https'
import got from 'got'

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function getDataWithNodeHttps(page) {
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

async function getDataWithGotHttp2(page) {
    let origin = 'https://match.yuanrenxue.com'
    let path = `/api/match/17?page=${page}`
        // return new Promise((resolve) => {
    const data = await got.get(origin + path, {
        // headers: {
        //     'Host': 'match.yuanrenxue.com',
        //     'Cookie': 'sessionid=egmh5yelvozhcfk5bzp4apqm0bggm0gg',
        //     'Accept': 'application/json, text/javascript, */*; q=0.01',
        //     'User-Agent': 'yuanrenxue.project',
        // },
        http2: true,
    }).json();
    console.log(data.headers)
    return data
        // })
}

let sum = 0
async function getAllData(pages) {
    for (let page = 1; page <= pages; page++) {
        const data = await getDataWithGotHttp2(page)
        sum += data.map(x => x.value).reduce((x, y) => x + y)
    }
    console.log('Total sum', sum)
}

getAllData(1)

// async function test() {
//     // import got from 'got';

//     const { headers } = await got(
//         'https://httpbin.org/anything', {
//             http2: true
//         }
//     );

//     console.log(headers);
// }
// test()