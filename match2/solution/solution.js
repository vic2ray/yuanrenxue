/**
 * This a solution in JavaScript for https://match.yuanrenxue.com/match/2
 */
import https from 'node:https'
import getCookie from './node-deobfuscator2.js'

// get cookie
let m = getCookie().replace('; path=/', '')

// send requests
let getData = (page) => {
    return new Promise((resolve) => {
        const options = {
            host: 'match.yuanrenxue.com',
            port: 443,
            path: '',
            method: 'GET',
            headers: {
                'Cookie': m,
                'User-Agent': 'yuanrenxue.project'
            }
        };
        options.path = `/api/match/2?page=${page}`;
        https.request(options, (res) => {
            res.on('data', data => {
                const jsonData = JSON.parse(Buffer.from(data).toString());
                console.log(`Get data from page ${page}, ${jsonData.state}`)
                resolve(jsonData.data)
            })
        }).end();
    })
}

async function getPageData(page) {
    const data = await getData(page);
    return [data.map(x => x.value).reduce((y, z) => y + z), data.length]
}

let price = 0;
async function getTotalData(totalPage) {
    for (let page = 1; page <= totalPage; page++) {
        const [pagePrice, pageCount] = await getPageData(page);
        console.log(`pagePrice: ${pagePrice}`)
        price += pagePrice;
    }
    console.log(`Total price: ${price}`);
}

getTotalData(5); // 248974