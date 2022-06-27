import https from 'node:https'
import { resolve } from 'node:path'


const headers = {
    "Host": "match.yuanrenxue.com",
    "User-Agent": "yuanrenxue.project",
    "Content-Length": "0",
    "Accept": "*/*",
    "Referer": "https://match.yuanrenxue.com/match/3",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cookie": "no-alert3=true",
}

function getSessionid() {
    return new Promise((resolve) => {
        const options = {
            'host': 'match.yuanrenxue.com',
            'port': 443,
            'path': '/jssm',
            'method': 'POST',
            'headers': headers
        }
        https.request(options, (res) => {
            // console.log(res.statusCode);
            // console.log(res.headers['set-cookie'][0], 'from node:https')
            const sessionid = /sessionid=\w+(?=;)/.exec(res.headers['set-cookie'][0])[0]
            res.on('readable', () => {
                console.log(sessionid)
                resolve(sessionid)
            })
        }).end()
    })
}

function getData(page) {
    return new Promise((resolve) => {
        const options = {
            'host': 'match.yuanrenxue.com',
            'port': 443,
            'method': 'POST',
            'headers': headers
        }
        options.path = `/api/match/3?page=${page}`;
        https.request(options, (res) => {
            res.on('data', data => {
                const jsonData = JSON.parse(Buffer.from(data).toString());
                console.log(`Get data from page ${page}, ${jsonData.state}`)
                resolve(jsonData.data)
            })
        }).end()
    })
}

async function getPageData(page) {
    const data = await getData(page);
    return data.map(x => x.value)
}

async function getTotalData(totalPage) {
    let orderIds = []
    for (let page = 1; page <= totalPage; page++) {
        const sessionid = await getSessionid()
        headers.Cookie = sessionid
        const orderId = await getPageData(page);
        orderIds.push(orderId)
    }
    console.log(orderIds.flat().sort((x, y) => x - y))
}

getTotalData(5)