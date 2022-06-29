import fs from 'node:fs'
import https from 'node:https'


function getData(page, m) {
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
            path: `/api/match/15?page=${page}&m=${m}`
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
async function getAllData(pages, m) {
    for (let page = 1; page <= pages; page++) {
        const data = await getData(page, m)
        sum += data.map(x => x.value).reduce((x, y) => x + y)
    }
    console.log('Total sum', sum)
}

const wasmBuffer = fs.readFileSync('./main.wasm')
WebAssembly.instantiate(wasmBuffer).then(results => {
    // instance = results.instance;
    const q = results.instance.exports.encode;
    const m = function() {
        const t1 = parseInt(Date.parse(new Date()) / 1000 / 2);
        const t2 = parseInt(Date.parse(new Date()) / 1000 / 2 - Math.floor(Math.random() * (50) + 1));
        return q(t1, t2).toString() + '|' + t1 + '|' + t2;
    };
    console.log(`m: ${m()}`)
    getAllData(5, m())
})