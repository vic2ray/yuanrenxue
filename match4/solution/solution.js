import https from 'node:https'

import { hex_md5 } from './hex_md5.js'


const options = {
    host: 'match.yuanrenxue.com',
    port: 443,
    method: 'get',
    path: '/api/match/4',
    headers: {
        'user-agent': 'yuanrenxue.project',
        'accept': 'application/json, text/javascript, */*; q=0.01'
    }
}

const img2hash2num = {
    'b4d0af311ce01ad863c972302ecb9686': '0',
    '3035eeb1e63671991c70156ea047ca6b': '1',
    '957808c4b053fa9dcc88eed602ace163': '2',
    '5315eb1d36bf842ee63524eb0b90a87f': '3',
    '802ca799889459ab1448e58f25394db6': '4',
    'f021495950f242ce00289a461dcabf86': '5',
    '524545b6182cca34985ac6ae40894aa9': '6',
    'd567b00027ad2e4fe9e402c3b89c3a1e': '7',
    '5206b01b9a86fb2c10ed935a0efeba72': '8',
    'b98fb6259953fdb5cb39ca87cf4d08f9': '9',
}

function getData(page) {
    return new Promise((resolve) => {
        options.path = `/api/match/4?page=${page}`
        https.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunck) => {
                rawData += chunck;
            })
            res.on('end', () => {
                const { key, value, iv, info } = JSON.parse(rawData)
                    // console.log(key, value)
                resolve([key + value, info])
            })
        }).end()
    })
}

async function parseData(page) {
    const [kv, info] = await getData(page);
    const hiddenClass = hex_md5(Buffer.from(kv, 'ascii').toString('base64').replace(/=/g, ''));
    console.log(`Page ${page} hidden class, ${hiddenClass}`)
    const imgs = info.match(/(?<=src=").*?(?=")/g)
    const nums = imgs.map((x) => img2hash2num[hex_md5(x)])
    const classes = info.match(/(?<=class=").*?(?=")/g).map(x => x.replace('img_number ', ''))
    const offsets = info.match(/(?<=style="left:).*?(?=px")/g).map(x => x / 11.5)
    const tdSplits = info.match(/(?<=<td>).*?(?=<\/td>)/g).map(x => x.match(/<img/g).length)
    let pageSum = 0
    while (tdSplits.length) {
        let tdSplit = tdSplits.shift() + 1
        let numList = [],
            offsetList = []
        while (--tdSplit) {
            let num = nums.shift(),
                clazz = classes.shift(),
                offset = offsets.shift()
            if (clazz != hiddenClass) {
                numList.push(num)
                offsetList.push(offset)
            }
        }
        // console.log(numList, offsetList)
        let newNumList = [0, 0, 0, 0]
        for (let i = 0; i < numList.length; i++) {
            newNumList[i + offsetList[i]] = numList[i]
        }
        const realNum = newNumList.map(x => x === 0 ? '' : x).join('')
        console.log('Rearange number:', realNum)
        pageSum += +realNum
    }
    return pageSum
}

let sum = 0
async function parseAllData(page) {
    for (let i = 1; i <= page; i++) {
        const pageSum = await parseData(i)
        sum += pageSum
    }
    console.log('Total sum', sum)
}

parseAllData(5)