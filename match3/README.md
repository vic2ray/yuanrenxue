# 题目信息

* 题目地址：https://match.yuanrenxue.com/match/3

* 提交请求：

``` js
GET /api/match/3?page=1 HTTP/2
Host: match.yuanrenxue.com
Cookie: sessionid=xyj86w5oy92s3yy13y8o6fbimqirhnx8
```

* 正确响应：

``` json
{"status": "1", "state": "success", "data": [{"value": 2838}, {"value": 7609}, ... }
```

# 解题过程

## 请求重放

这题没有debugger，但难在于在其他工具中复现请求。如果使用Python的requests库直接请求`/api/match/3`，带上`sessionid`，会得到一个script：

```js
// <script>var x="div@Expires@@captcha@while@...</script>
// 展开
var x = "div@Expires@@captcha@while@length@@...".replace(/@*$/, "").split("@")
    y = "1L N=22(){1i('17.v=17.1e+17.29.1k(/[\\?..."
  , f = function(x, y) {
    var a = 0
      , b = 0
      , c = 0;
    x = x.split("");
    y = y || 99;
    while ((a = x.shift()) && (b = a.charCodeAt(0) - 77.5))
        c = (Math.abs(b) < 13 ? (b + 48.5) : parseInt(a, 36)) + y * c;
    return c
}
  , z = f(y.match(/\w/g).sort(function(x, y) {
    return f(x) - f(y)
}).pop());
while (z++)
    try {
        debugger ;eval(y.replace(/\b\w+\b/g, function(y) {
            return x[f(y, z) - 1] || ("_" + y)
        }));
        break
    } catch (_) {}
```

这段代码主要由字符串数组`x`和jsfuck混淆的`y`运算后得到，几次尝试后发现取`z=51`时，生成`y`字符串能够由eval执行，但看样子是防调试代码：

``` js
var _N=function(){
    setTimeout('location.href=location.pathname+location.search.replace(/[\\?|&]captcha-challenge/,\\'\\')',1500);
    document.cookie=...
```

到这里再往下分析就已经入套了。我们之后再看这段代码。这里用爬虫工具直接请求`/api/3`的结果是一个`<script>eval code</script>`，类型`text/html; charset=utf-8`，尽管这有可能将数据生成过程隐藏在其中，但正确的返回结果是`application/json`，数据并未经任何处理。

我们在浏览器中重放XHR，得到了和工具请求一样的返回类型。同一个请求，服务端返回了两种不同类型的数据？

## 请求顺序

查看源码，发现在acjax请求前先进行了一次请求：

```js
$.ajax({
    url: window.url,
    dataType: "json",
    async: false,
    data: list,
    type: "GET",
    beforeSend: function(request) {
        (function() {
            var httpRequest = new XMLHttpRequest();
            var url = '/jssm';
            httpRequest.open('POST', url, false);
            httpRequest.send()
        })()
    },
    success: function(data) {
        data = data.data;
        ...
    }
    ...
}
```

从`success`回调处理来看，证实了请求得到的一定是json数据，而不是script。响应结果不同只有可能是先`beforeSend`了`/jssm`。这是一个post请求，响应类型是`image/jpg`，重点在于响应头中的`sessionid`：

```js
content-length: 0
content-type: image/jpg
date: Sun, 26 Jun 2022 07:05:28 GMT
server: nginx
set-cookie: sessionid=sm24vffeu6tlbj17uln7m2ys79omqxwa; expires=Sun, 26 Jun 2022 13:05:28 GMT; HttpOnly; Max-Age=21600; Path=/; SameSite=Lax
vary: Cookie
```

那我们先请求`/jssm`，拿到`sessionid`，再请求`/api/3`。背后的结果令人感动：用python-requests请求结果始终没有出现`set-cookie`响应头：

``` Python
import requests

headers = {
    "Host": "match.yuanrenxue.com",
    "Cookie": "qpfccr=true; no-alert3=true",
    "Content-Length": "0",
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36",
    "Accept": "*/*",
    "Origin": "https://match.yuanrenxue.com",
    "Referer": "https://match.yuanrenxue.com/match/3",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
}
url = "https://match.yuanrenxue.com/jssm"
response = requests.get(url, headers=headers, allow_redirects=False)

print(response.status_code)
print(response.headers)
```

> 202
> 
> {'Server': 'nginx', 'Date': 'Sun, 26 Jun 2022 13:10:57 GMT', 'Content-Type': 'image/jpg', 'Content-Length': '0', 'Connection': 'keep-alive'}

很奇怪，拿不到sessionid。那我直接用浏览器生成的sessionid到脚本中请求api呢？依旧返回错误结果。而同时在浏览器中重放/jssm和/api/3，得到正确结果。完整地复制headers，在脚本中重放，失败......难道还需要在`beforeSend`页面请求？不是，因为只重放这两个就能拿到正确结果。难道是cookie不全？清空所有cookie，重放/jssm，这回同脚本一样没有正确响应，跳转回了题目列表页；再进入第三题，逐个清除cookie后重放，几轮测试后发现只要保证cookie不为空，就能正确响应，那么也不会是cookie的原因了。难道是ip的缘故？服务端记录了正确请求的ip，保持同一TCP连接会话才会正确响应？本地发送脚本请求，与浏览器重放第一个/jssm请求上下文时机是一致的，排除。

## BurpSuite

既然本地脚本发出的同一个请求竟然和浏览器中发出的响应结果不一样，掏出大杀器BurpSuite，开启抓包。首先是浏览器结果，这里我们移除了HTTP/2相关的`Sec-*`和缓存控制`Cache-Control`、`Pragma`请求头：

```js
POST /jssm HTTP/2
Host: match.yuanrenxue.com
Cookie: qpfccr=true
Content-Length: 0
User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36
Accept: */*
Origin: https://match.yuanrenxue.com
Referer: https://match.yuanrenxue.com/match/3
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8

HTTP/2 202 Accepted
Server: nginx
Date: Sun, 26 Jun 2022 13:33:54 GMT
Content-Type: image/jpg
Content-Length: 0
Vary: Cookie
Set-Cookie: sessionid=3xihdyaycorqp92lprmaxdoc8poy1zof; expires=Sun, 26 Jun 2022 19:33:54 GMT; HttpOnly; Max-Age=21600; Path=/; SameSite=Lax
```

右键请求，`Send to Repeater`，这样就可以在Burp中随时重放了。然后抓包Python脚本请求结果：

```js
POST /jssm HTTP/2
Host: match.yuanrenxue.com
User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36
Accept-Encoding: gzip, deflate
Accept: */*
Connection: keep-alive
Cookie: qpfccr=true
Content-Length: 0
Origin: https://match.yuanrenxue.com
Referer: https://match.yuanrenxue.com/match/3
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8

HTTP/2 202 Accepted
Server: nginx
Date: Sun, 26 Jun 2022 13:39:18 GMT
Content-Type: image/jpg
Content-Length: 0
```

破案了，唯一不同地方只有请求头的顺序。我们在Repeater中尝试删除无用头、修改头次序，不断重放，测试必须请求头和优先次序，最终确定以下请求为必须：

``` js
Host: match.yuanrenxue.com
Cookie: qpfccr=true
Content-Length: 0
Accept: */*
Referer: https://match.yuanrenxue.com/match/3
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
```

`Host`在第一位置，`Content-Length`、`Accept`、`Referer`、`Accept-Encoding`、`Accept-Language`五个位置次序固定不可更改，`Cookie`可出现在任意位置。这样，确定了headers顺序就可以用脚本实现了。但最大的疑惑在于，HTTP请求工具为什么会改变请求头顺序？顺序为什么和浏览器发出的不一致？

## Python-HTTP库

我们先来看Python-`requests`库的出现的相关问题。早2016年，在代码仓库的#3038号issue-[Order of request headers should be preserved when sent to origin server](https://github.com/psf/requests/issues/3038)中提到请求头次序不符合预期结果的问题，评论中有人提议使用`collections.OrderedDict`有序字典存储headers，但截至目前该方案也还是无效：

``` Python
from collections import OrderedDict

headers = OrderedDict({
        "Host": "match.yuanrenxue.com",
        "Content-Length": "0",
        "Accept": "*/*",
        "Referer": "https://match.yuanrenxue.com/match/3",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": "no-alert3=true",
})
# OrderedDict([('Host', 'match.yuanrenxue.com'), ('Content-Length', '0'), ('Accept', '*/*'), ('Referer', 'https://match.yuanrenxue.com/match/3'), ('Accept-Encoding', 'gzip, deflate'), ('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8'), ('Cookie', 'no-alert3=true')])
```

在Python3.8版本以后所有字典默认为有序字典，因此这个做法和默认dict效果是一样的，传入后仍然被requests重新排序。另一个评论提到，`urllib3`实际上确实保留了请求标头的顺序。尝试：

``` Python
import urllib3

headers = {
        "Host": "match.yuanrenxue.com",
        "Content-Length": "0",
        "Accept": "*/*",
        "Referer": "https://match.yuanrenxue.com/match/3",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": "no-alert3=true",
}
http = urllib3.PoolManager()
r = http.request('POST', 'https://match.yuanrenxue.com/jssm', headers=headers)
r.headers
# HTTPHeaderDict({'Server': 'nginx', 'Date': 'Sun, 26 Jun 2022 14:17:14 GMT', 'Content-Type': 'image/jpg', 'Content-Length': '0', 'Connection': 'keep-alive', 'Vary': 'Cookie', 'Set-Cookie': 'sessionid=72rrmphsrt9pnuwdrop5n6dlzkql6wy9; expires=Sun, 26 Jun 2022 20:17:14 GMT; HttpOnly; Max-Age=21600; Path=/; SameSite=Lax'})
```

的确如此！`urllib3`内部并没有修改请求头顺序。那么requests是否有解决方案？[having-trouble-maintaining-order-of-session-headers-when-making-a-request](https://stackoverflow.com/questions/59795562/having-trouble-maintaining-order-of-session-headers-when-making-a-request)对这个问题解释是源于内部设置了默认headers，而解决方案很简单，就是使用`requests.session`并将替换掉默的`session.headers`：

``` Python
session = requests.session()
session.headers = {
        "Host": "match.yuanrenxue.com",
        "Content-Length": "0",
        "Accept": "*/*",
        "Referer": "https://match.yuanrenxue.com/match/3",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": "no-alert3=true",
}
r = session.post('https://match.yuanrenxue.com/jssm')
print(r.headers['Set-Cookie'])
# sessionid=f9pm05ixxxwyvzmlm844qg52n6xfx82s; expires=Sun, 26 Jun 2022 20:27:45 GMT; HttpOnly; Max-Age=21600; Path=/; SameSite=Lax
```

这么简单！？是的，原以为维持一个会话进行多个请求时才需要使用`requests.session`，只一个请求时使用session也大有用处。所以，在使用requests时，养成习惯优先使用`requests.session`，因为重新赋值`session.headers`将替换掉内部的默认请求头，也就没有默认排序。这也是[官方文档](https://requests.readthedocs.io/en/latest/user/advanced/?highlight=headers#header-ordering)中的解决方案。

另一个解决方案是，自制一个`dict.items`对象传入，因为普通的`dict_items`和`OrderedDict`对象都会被修改，那么传一个不一样类型，但值一样的dict进去，就不会被更改了。我们先看前面俩长什么样：

``` python
>>> headers.items()
dict_items([('Host', 'match.yuanrenxue.com'), ('Content-Length', '0'), ('Accept', '*/*'),...])
>>> orderedDictHeaders.items()
OrderedDict([('Host', 'match.yuanrenxue.com'), ('Content-Length', '0'), ('Accept', '*/*'), ...])
```

本质上结构都是tuple list，那么构建一个类，方法`items`返回元组列表：

``` python
class HeaderItems():
    def items(self):
        return [('Host', 'match.yuanrenxue.com'), ('Content-Length', '0'), ('Accept', '*/*'), ('Referer', 'https://match.yuanrenxue.com/match/3'), ('Accept-Encoding', 'gzip, deflate'), ('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8'), ('Cookie', 'no-alert3=true')]
HeaderItems().items()

[('Host', 'match.yuanrenxue.com'),
 ('Content-Length', '0'),
 ('Accept', '*/*'),
 ('Referer', 'https://match.yuanrenxue.com/match/3'),
 ('Accept-Encoding', 'gzip, deflate'),
 ('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8'),
 ('Cookie', 'no-alert3=true')]
```

样子和普通字典和有序字典一样。传入headers试一下：

``` python
req = requests.post('https://match.yuanrenxue.com/jssm', headers=HeaderItems())
print(req.headers['Set-Cookie'])
# sessionid=x92oi2jwf5s75c56h4jnpu16hebcgkya; expires=Sun, 26 Jun 2022 20:54:41 GMT; HttpOnly; Max-Age=21600; Path=/; SameSite=Lax
```

成功拿到sessioid！说明顺序正确，自己构造的字典管用。不过，还是建议使用官方推荐的session大法。

## Nodejs-HTTP库

有了正确顺序且有其他语言库的实现，那么在node中就可以测试哪些库不会默认重新排序。测试库使用目前流行下载较多的：`node:https`、`node-fetch`（Weekly Downloads: 33,313,303）、`axios`（Weekly Downloads: 28,369,028），`request`（Weekly Downloads: 19,414,422），尽管request库在2020年就停止更新，但至今仍有很大的使用量。

首先是node内置库：

```js
const headers = {
    "Host": "match.yuanrenxue.com",
    "Content-Length": "0",
    "Accept": "*/*",
    "Referer": "https://match.yuanrenxue.com/match/3",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cookie": "no-alert3=true",
}

const req = https.request(options, (res) => {
    console.log(res.statusCode);
    console.log(res.headers['set-cookie'], 'from node:https')
})
req.write('')
req.end()
```

成功拿到sessioid。接着测试`node-fetch`：

```js
fetch('https://match.yuanrenxue.com/jssm', {
    method: 'post',
    headers: headers
}).then((res) => {
    console.log(res.headers, 'from node-fetch');
})
```

失败。在仓库issue中发现该问题并目前未解决：[Keep headers order while sending them](https://github.com/node-fetch/node-fetch/issues/1569)。然后是`axios`、`request`：

```js
// axios
axios.post('https://match.yuanrenxue.com/jssm', {}, { headers }).then(res => {
    console.log(res.headers['set-cookie'], 'from axios')
})

// request
let options2 = {
    url: 'https://match.yuanrenxue.com/jssm',
    method: 'POST',
    headers: headers
};
request(options2, (_, res) => {
    console.log(res.headers['set-cookie'], 'from request');
});
```

axios失败，request成功。不过在axios仓库issue找到了解决方案：[Can I put the 'User-Agent' header before 'Accept' and 'Content-Type'](https://github.com/axios/axios/issues/4611)，就是清空实例对象的默认请求头后再请求（类似request.session）：

```js
const instance = axios.create({
    baseURL: "https://match.yuanrenxue.com",
    timeout: 2000,
});
instance.defaults.headers = {};
instance.post('/jssm', {}, { headers }).then(res => {
    console.log(res.headers, 'from axios instance')
})
```

# 复盘回顾

这个问题的根本在于浏览器发出请求和HTTP库发出请求的顺序不同。尽管在浏览器控制台中看到请求头的顺序似乎是按照a-z有序排列的，但在服务端收到的顺序才是浏览器真正发出请求的顺序。我们在服务器上小撸一个flask来测试一下：

``` python
from flask import Flask
from flask import request

app = Flask(__name__)

@app.route('/')
def main():
    print(request.headers)
    return 'hello flask'

app.run('0.0.0.0', 8080)
```

使用Chrome浏览器访问，得到打印结果：

``` python
Host: myserver:8080
User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cache-Control: max-age=0
Cookie: ...
Upgrade-Insecure-Requests: 1
```

然后使用Mozilla Firefox的结果：

```Python
Host: myserver:8080
User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2
Accept-Encoding: gzip, deflate
Connection: keep-alive
Upgrade-Insecure-Requests: 1
```

除了请求头的Accept等值各个浏览器发出的不一样，两者发出的`Accept-Language`和`Accept-Encoding`顺序也不同。但`Host`始终在HTTP请求首行之后的第一行，尽管控制台中不显示该请求头（实际上是合并到了URL中展示），`User-Agent`始终在`Accept`头之前，紧随`Host`之后，这几乎是所有浏览器遵循的次序，也是最容易区分爬虫工具的地方。

然而，还有一个最容易忽略的工具，那就是抓包工具。抓包工具作为本地HTTP代理服务器，转发浏览器发出的所有请求，必然会以自己的实现方式来拦截、修改、重放请求，且作为HTTPS代理时，对服务器来说完全是和抓包工具在交换秘钥及数据通信。我们看一下BurpSuite代理Firefox的请求：

```python
Host: myserver:8080
User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2
Accept-Encoding: gzip, deflate
Connection: close
Upgrade-Insecure-Requests: 1
Pragma: no-cache
Cache-Control: no-cache
```

发出的请求头和flask端看到的结果一致，修改了`Connection`并增加了`no-cache`，证实了抓包工具默认也会修改一些请求头设置，但基本上保持了和浏览器发出请求的头顺序。由此，如果遇到服务器校验请求头次序导致爬虫不通过（对于完全相同的一个请求，浏览器和库模拟请求结果不一致时首先怀疑属于此类问题），从浏览器中复制出来的headers顺序其实也是错的（a-z有序展示），如果没有服务端的控制权，抓包工具中的结果能尽可能还原真实的请求头次序。

解决问题过程中的其他参考：

* [http请求头的顺序](https://www.cnblogs.com/baiduomai/archive/2012/10/19/2730673.html)
* [python爬虫 - js逆向之猿人学第三题请求顺序验证+请求头验证](https://www.cnblogs.com/Eeyhan/p/15292983.html)
* [Why ordering HTTP headers is important](https://sansec.io/research/http-header-order-is-important)
* [Headers should be in an ordered dict (Python)](https://github.com/curlconverter/curlconverter/issues/79)