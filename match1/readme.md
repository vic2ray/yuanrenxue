
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

但最简单的方法是，直接在Console中复制全部编码字符，回车后自动转换，笨！转换后就能看到全貌了：

``` js
window['url'] = '/api/' + 'match' + '/1', request = function() {
    // ...
}, request();
```

顺便把`' + '`全部连接起来。主要函数如下：

``` js
window['url'] = '/api/match/1', request = function() {
    var _0x2268f9 = Date['parse'](new Date()) + (16798545 + -72936737 + 156138192),
        _0x57feae = oo0O0(_0x2268f9['toString']()) + window['f'];
    const _0x5d83a3 = {};
    _0x5d83a3['page'] = window['page'], _0x5d83a3['m'] = _0x57feae + '丨' + _0x2268f9 / (-1 * 3483 + -9059 + 13542);
    var _0xb89747 = _0x5d83a3;
    $['ajax']({
        'url': window['url'],
        'dataType': 'json',
        'async': ![],
        'data': _0xb89747,
        'type': 'GET',
        'beforeSend': function(_0x4c488e) {},
        'success': function(_0x131e59) {
            // 成功获取数据后渲染部分省略
        }
    });
}, request();
```

## 参数生成

### m

可见请求参数data有两个键，一个是`page`不必多说，一个是`m`由三部分拼接而成：

* _0x57feae = oo0O0(_0x2268f9['toString']()) + window['f'];
* 特殊符号丨
* _0x2268f9 / 1000

`_0x2268f9`通过`Date.parse(new Date())`取当前时间戳，然后增加时间偏移量100000000。那么主要跟踪参数就在于`oo0O0`和`window.f`了。在源码中搜索oo0O0，全貌大致如下：

``` js
function oo0O0(mw) {
    window.b = '';
    for (var i = 0, len = window.a.length; i < len; i++) {
        console.log(window.a[i]);
        window.b += String[document.e + document.g](window.a[i][document.f + document.h]() - i - window.c)
    }
    var U = ['W5r5W6VdIHZcT8kU', 'WQ8CWRaxWQirAW=='];
    var J = function(o, E) { 
        // ... 
    }
    eval(atob(window['b'])[J('0x0', ']dQW')](J('0x1', 'GTu!'), '\x27' + mw + '\x27'));
    return ''
}

```

### window.b

函数返回值为空，因此主要跟踪对象为`window.f`。但代码中没有发现f相关信息，而是在循环生成字符串`window.b`并最终eval执行。因此可以推断window.b是可执行代码，并必然包含了window.f的生成。那么查看其生成过程，发现是遍历`window.a`而来，替换上文中出现的`document.x`变量后关键部分为：

```js

window.b += String.fromCharCode(window.a[i].charCodeAt() - i - window.c)

```

首先取window.a[i]的字符编码码元值，然后向下偏移`i+window.c`个码元，最后转为对应字符拼接到window.b。`window.a`在头部代码段中赋值，是很长一串“乱码”，因为是偏移后的字符串。

### window.c

这里还需要确定`window.c`的值，找到源码中以下定义：

``` html
<script>
    window.b = '';
    window.c = $('script').size() - 6;
    document.d = String;
</script>
```

使用jQuery获取文档中`script`标签数量并减6。看似不坑实则大坑。如果直接在console中运行，得到结果为21。但这是页面渲染完成后的结果，我们回顾一下DOM加载过程：首先拿到整个html文本源码，然后从head加载到body，遇到script标签时立即阻塞渲染并执行（除非标签设置了async、defer属性），遇到普通元素则立即渲染到浏览器。当DOM加载到这个script时，js代码运行导致DOM阻塞（因为可能修改DOM元素），因此之后的script是无法被统计到的，此时计算得到的script数量（包括本身）被赋值到全局变量c中。那么我们只需要统计在这之前的script数量即可。

好，一共数到了12个，那么c=6？在console打印一下，发现竟然是5？全局变量只有一次赋值怎么不一样？那么只有可能是在这之后的代码中动态的添加了一个script，查找`createElement`果然发现以下百度代码统计插件：

``` html
<script>
    var _hmt = _hmt || [];
    (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?c99546cf032aaa5a679230de9a95c7db";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
    })();
</script>
```

在页面第一个script前注入了统计访问量的js代码。至此查明了window.c。

### window.f

在最终执行前，window.b生成后在还需要`atob`进行解码，然后调用了不知道是什么的`J`玩意：

``` js
var U = ['W5r5W6VdIHZcT8kU', 'WQ8CWRaxWQirAW=='];
var J = function(o, E) {
    o = o - 0x0;
    var N = U[o];
    if (J['bSSGte'] === undefined) {
        //...
    }
    var H = J['qlVPZg'][o];
    return H === undefined ? (J['TUDBIJ'] === undefined && (J['TUDBIJ'] = !![]), N = J['luAabU'](N, E), J['qlVPZg'][o] = N) : N = H, N
};
eval(
    atob(window['b'])
        [J('0x0', ']dQW')]
            (J('0x1', 'GTu!'), '\x27' + mw + '\x27')
    );
```

因为这个J混淆的实在太严重，又不涉及其他变量，如果解不出来只需要原样复制执行，我们首要任务还是先找到window.f的下落。其必定隐藏在了window.b中，我们从console中导出该值，base64解码后如下：

``` js
`var hexcase = 0;
var b64pad = "";
var chrsz = 16;
function hex_md5(a) { return binl2hex(core_md5(str2binl(a), a.length * chrsz)) }
// ...
window.f = hex_md5(mwqqppz)`
```

非常的amazing啊，竟然还原了个md5函数，但注意这时还是字符串形式。解开后发现末尾调用`hex_md5`生成了window.f，但参数`mwqqppz`未出现任何定义。再结合上文中主函数`oo0O0`中传入但一直未使用的参数`mw`，只有一种可能了：js代码字符串中的未申明变量mwqqppz被替换成了mw，再由eval执行`hex_md5(mw)`生成window.f。在console中验证该猜想：

``` shell
> [J('0x0', ']dQW')].toString()
'replace'
> J('0x1', 'GTu!')
'mwqqppz'
> '\x27'+ 'mw_value' +'\x27'
"'mw_value'"
```

# 复盘回顾

这道题主要混淆点在于字符编码转换、码元偏移。首先准备md5函数，并在末尾调用赋值给变量window.f，之后再对加密函数和调用进行base64编码得到window.b，每一个字符递增偏移`i+5`个码元，转为字符组成window.a，最终显示为无序乱码。生成参数m时，将时间戳+偏移进行md5加密，但因为window.b解码后是代码字符串，因此混淆replace函数，替换定义时调用时的固定值'mwqqppz'为`mw`变量字符串。