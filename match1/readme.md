
# 题目信息

* 题目地址：https://match.yuanrenxue.com/match/1

* 提交请求：

``` shell
curl 'https://match.yuanrenxue.com/api/match/1?page=2&m=420f4eca8b0f550718a0c733d804ef90%E4%B8%A81655892403'
```

* 正常响应：

``` json
{"status": "1", "state": "success", "data": [{"value": 2366}, {"value": 2108}, {"value": 6159}, {"value": 5685}, {"value": 2010}, {"value": 7109}, {"value": 1002}, {"value": 9300}, {"value": 8995}, {"value": 5732}]}
```

* 异常响应：

``` json
{"error": "token failed"}
```

# 解题过程

## debbugger

* /static/match/safety/uyt.js

``` js
setInterval(function () {
    if (eval.toString() !== 'function eval() { [native code] }'){
    w();
    dd();
    while (1){
        console.error('苦蟲');
        console.error('闆蘭')
    }
}
    if (setInterval.toString() !== 'function setInterval() { [native code] }'){
        w();
        dd();
        console.error('總難煉為');
        debugger
    }
    console.error('永不言棄,jy');
}, 500);

``` 

这个定时器每半秒钟检查`eval`和`setInterval`函数有没有被更改，否则执行`w()`和`dd()`，然后是死循环和debugger。在源码中找到这两个函数的定义：

``` html
<script>function w(){window={}}function dd(){document={}}</script>
```

即将`window`和`document`对象清空。这里留下疑点1：为什么要防止这两个内置函数被篡改？

* /static/match/safety/uzt.js

``` js
setInterval(function () {
    debugger
}, 500)
```

这是个很明显的防调试。因为出现在js文件中，可以使用抓包工具替换为空，或者使用Chrome插件拦截替换该请求（自制插件添加declarativeNetRequest静态规则或ReRes插件）。受疑点1的启发，我们可以尝试在控制台把`setInterval`重新赋值使其失效：

``` js
setInterval = ''
```

点击debugger继续执行代码，发现跳到了上一个js文件内的debugger，再继续执行，又跳回来......这是由于`setInterval`内代码属于异步代码，主线程执行到创建定时器时向任务队列中添加代码，并在主线程空闲后、指定间隔时间重复执行这段代码。包括上一个js文件，一共在任务队列中创建了两个定时器。在主线程中把函数置空，只是影响了在主线程中创建新的定时器，而不会影响已有定时器内的代码执行！因此，当第二个debugger继续执行后，任务队列中第一个定时器立即得到执行（进入主线程），其判断环境中`setInterval`为空，又debugger住了。因此hook定时器函数并没有用，除非在这两个js执行之前hook掉，这样定时器不会生成，debugger也永远不会执行。

一种做法是修改源码，删除这两个script标签然后替换，效果和拦截js文件相同，从根源上阻止定时器生成。另外一种做法也是最优解是清除所有定时器：

``` js
for (let intervalID = 0; intervalID < 10; intervalID++) {
    window.clearInterval(intervalID);
}
```
因为这里可见的定时器只有两个，所以`intervalID`上限不需要太大。控制台测试发现定时器id是从2开始依次递增的（也不知道为什么是2开始），因此只需要循环清除定时器即可。不过刷新网页后重新生成需要再清除。

## XHR断点

解决了无限debugger后，在调试栏添加XHR断点，以拦截任何ajax请求，然后点击翻页请求下一页数据，断住后往下查找调用堆栈，发现是由一个匿名函数内的request函数触发的，而这个匿名函数通过`eval`执行：

``` html
<script>eval('script conent string')</script>
```

我们把eval内的js代码字符串复制出来，部分如下：

```js
window[\'\\x75\\x72\\x6c\'] = \'\\x2f\\x61\\x70\\x69\\x2f\' + \'\\x6d\\x61\\x74\\x63\\x68\' + ...
```

因为是字符串代码，转为正常的js代码需要处理掉大量的`\'`和`\\`、`\n`转义，直接一键替换即可，然后将字符编码的十六进制ASCII码`\xnn`和Unicode码`\unnnn`转为字符显示。但大部分的编码转换工具都不带\x和\u，而且混杂了正常变量代码符号，我们可以使用`String.fromCharCode`还原字符：

``` js

let fromCharCode = (str) => {
    return str.replace(/\\x(\w{2})|\\u(\w{4})/g, ($1)=>{
        return String.fromCharCode(`0x{$1}`)
    })
}

```

但最简单的方法是，直接在Console中复制全部编码字符，回车后自动转换，笨！
