import https from 'node:https'


const option = {
    host: 'match.yuanrenxue.com',
    port: 443,
    path: '/api/match/12',
    headers: {
        'user-agent': 'yuanrenxue.project',
        'cookie': 'sessionid=wddonvvjv744mgvpw13c09gg1j6q6ptx'
    }
}

function getData(page) {
    return new Promise((resolve) => {
        option.path = `/api/match/12?page=${page}&m=${Buffer.from('yuanrenxue'+page).toString('base64')}`
        https.request(option, (res) => {
            res.on('data', data => {
                const jsonData = JSON.parse(Buffer.from(data).toString());
                console.log(`Get data from page ${page}, ${jsonData.state}`)
                resolve(jsonData.data)
            })
        }).end()
    })
}

let sum = 0
async function getPageData(page) {
    for (let i = 1; i <= page; i++) {
        const data = await getData(i);
        let pageSum = data.map(x => x.value).reduce((y, z) => y + z)
        sum += +pageSum
    }
    console.log('Total sum', sum)
}

getPageData(5)