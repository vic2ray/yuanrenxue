import https from 'node:https'
import fetch from 'node-fetch'


// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0' // 关闭TSL验证

const headers = {
    "Host": "match.yuanrenxue.com",
    "Content-Length": "0",
    "Accept": "*/*",
    "Referer": "https://match.yuanrenxue.com/match/3",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cookie": "no-alert3=true",
}

// node:https库可以
const options = {
    'host': 'match.yuanrenxue.com',
    'port': 443,
    'path': '/jssm',
    'method': 'POST',
    'headers': headers
}
const req = https.request(options, (res) => {
    console.log(res.statusCode);
    console.log(res.headers['set-cookie'], 'from node:https')
})
req.write('')
req.end()

// node-fetch库不行
fetch('https://match.yuanrenxue.com/jssm', {
    method: 'post',
    headers: headers
}).then((res) => {
    console.log(res.headers['set-cookie'], 'from node-fetch');
})

import request from 'request'

// request库可以
let options2 = {
    url: 'https://match.yuanrenxue.com/jssm',
    method: 'POST',
    headers: headers
};
request(options2, (_, res) => {
    console.log(res.headers['set-cookie'], 'from request');
});

import axios from 'axios'

// 1. Axios这样不行
axios.post('https://match.yuanrenxue.com/jssm', {}, { headers }).then(res => {
    console.log(res.headers['set-cookie'], 'from axios')
})

// 2. Axios这样行
const instance = axios.create({
    baseURL: "https://match.yuanrenxue.com",
    timeout: 2000,
});
instance.defaults.headers = {};
instance.post('/jssm', {}, { headers }).then(res => {
    console.log(res.headers['set-cookie'], 'from axios instance')
})