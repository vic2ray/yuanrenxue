# 题目信息

* 题目地址：https://match.yuanrenxue.com/match/2

* 提交请求：

``` js
GET /api/match/2 HTTP/2
Host: match.yuanrenxue.com
Cookie: m=cb7bab05e4fd04b626c3e4e23c1c23cc|1655901448000
```

* 正常响应：

``` json
{"status": "1", "state": "success", "data": [{"value": 3592}, {"value": 1829}, {"value": 3753}, {"value": 5054}, {"value": 9894}, {"value": 1037}, {"value": 7581}, {"value": 5257}, {"value": 8218}, {"value": 5244}]}
```

# 解题过程

## debugger

打开控制台直接陷入无限匿名debugger，查看堆栈调用，全都是在VM虚拟机中执行的函数：

``` js
(function anonymous(
) {
debugger
})
```

找到最上层调用函数，是在`<script>`标签内执行的，因此不能以替换文件的方式解决。我们掏出抓包工具进行分析，这里我用Burpsuite。一共抓到三个关键包：

``` js
// 1 - Length: 277844
GET /match/2 HTTP/2 200 OK

<script>var $dbsm_0x123c=['\x48\x32\x41\x47', ...

// 2 - Length: 46951
GET /match/2 HTTP/2 200 OK
Cookie: m=e83afe046ceafc5efee32ac34c30debf|1655902552000

<!DOCTYPE html><html lang="en"class="no-js"> ...

// 3 - Length: 337
GET /api/match/2 HTTP/2 200 OK
Cookie: m=e83afe046ceafc5efee32ac34c30debf|1655902552000

{"status": "1", "state": "success", "data": ...
```

第一次请求返回只包含一个大script的HTML，执行后生成`cookie-m`，第二次请求应该是生成m后立即触发，携带cookie请求正常HTML源码，第三个请求得到数据并渲染加载。debugger就出现在大script内，去除应该是不太可能，源码被是专门算法混淆过的，也导致体积如此庞大（压缩后近46K），我们尝试先解混淆

## obfuscator

混淆算法来自：`https://obfuscator.io/`

> 该工具将您的原始 JavaScript 源代码转换为一种新的表示形式，在未经授权的情况下更难理解、复制、重用和修改。
> 
> 虽然 UglifyJS（和其他缩小器）确实使输出代码更难理解（压缩和丑陋），但可以使用 JS 美化器轻松将其转换为可读的东西。该工具通过使用各种转换和“陷阱”来防止这种情况，例如自我防御和调试保护。
> 
> 通过一系列转换，例如变量/函数/参数重命名、字符串删除等，您的源代码被转换为不可读的东西，同时工作与以前完全一样。

其中几个关键的混淆设置：

* identifierNamesGenerator：设置标识符名称生成器。
* stringArray：移除字符串文字并将它们放置在一个特殊的数组中。例如，var m = “ Hello World”中的字符串“ Hello World”; 将被替换为 var m = _ 0x12c456[0x1] ;
* stringArrayIndexShift：字符数组索引偏移
* selfDefending：不要以任何方式改变混淆后的代码与这个选项混淆，因为任何改变，如代码的丑化可以触发自卫和代码不再工作！
* debugProtection：这个选项使得几乎不可能使用开发工具的调试器功能(包括基于 WebKit 和 MozillaFirefox 的调试器功能)。
* disableConsoleOutput：通过将它们替换为空函数，禁用 console.log、 console.info、 console.error、 console.warn、 console.debug、 console.Exception 和 console.trace 的使用。这使得调试器的使用更加困难。
* deadCodeInjection：大幅增加混淆代码的大小(高达200%) ，只有在混淆代码的大小不重要时才使用。

这些特征将在之后的代码分析中挨个体验(狗头)。而关于de-obfuscator的工具网站也很多，但因为混淆时可以设置的参非常多，这些工具也仅能做一些通用的反混淆过程，如：将类十六进制_0xffffff的变量重命名，代码格式化，将十六进制数转为十进制等。总之，没有一劳永逸完全还原混淆代码的工具，代码分析必不可少。

找了一圈后，发现`https://deobfuscate.io/`效果不错，这域名简直天生一对。把配置全勾上，转换后的代码1350行，开干！

## 字符数组

首行暴击，一个超大的字符数组，也就是混淆设置中的stringArray了。如下：

``` js
var $dbsm_0x123c = ["H2AG", "wrPCtsOE", "w73Dky8=", ...]
```

数组长度为1260。搜索$dbsm_0x123c，发现只在随后两个函数中使用了这个字符数组：

``` js
(function(oreste, emron){
    // ...
}($dbsm_0x123c, 112))
var $dbsm_0x42c3 = function(dajaha) {
    // ...
    daveney = $dbsm_0x123c[dajaha];
    // ...
};
```

是的，一个地方作为立即执行函数的参数传入，一个地方用于取值。那么，该立即执行函数内部有极大可能对数组进行更改，当调用$dbsm_0x42c3时返回数组内某个元素（字符串）。因此，我们重点关注两个关键点：

1. 立即执行函数内如何对数组进行变换
2. 读取字符数组的函数如何返回数组值

## 字符数组移位

传入立即执行函数的形参`oreste`、`emron`分别对应实参字符数组和112。我们直接跳过头部的大量赋值操作，关注将会执行的代码

``` js
iOLOQL = "$1", OQ1oqQ = "counter", IO0OOi = 1, QqQlQQ = "counter",
myldred = function(valerieann) { ...
}, tarahji = function() { ...
}, tarahji();
```

全是逗号表达式，最后执行了`tarahji`：

``` js
mirsab = { ...
}, yajahira = function() { ...
}, , mirsab.updateCookie = yajahira, irvan = "", harsimar = mirsab.updateCookie();
if (!harsimar) {
    mirsab.setCookie(["*"], OQ1oqQ, IO0OOi);
} else if (harsimar) {
    irvan = mirsab.getCookie(null, QqQlQQ);
} else {
    mirsab.removeCookie();
}
```

执行的地方在条件判断中的`harsimar`，顺着执行了`yajahira`：

``` js
yajahira = function() {
    eudella = new RegExp("\\w+ *\\(\\) *{\\w+ *['|\"].+['|\"];? *}");
    return eudella.test(mirsab.removeCookie.toString());
}
```

而此处返回的test结果是永真，因此分支处只会走`mirsab.getCookie`。这就是所谓的`deadCodeInjection`，用大量的分支语句混淆视线，实际运行时只会走一个分支，让人分析一通只后只得到一个true/false的结果。继续跟踪代码，`getCookie`如下：

```js
getCookie: function(synai, ixchell) {
    synai = synai || function(dafni) {
        return dafni;
    }, hartaj = synai(new RegExp("(?:^|; )" + ixchell.replace(/([.$?*|{}()[]\/+^])/g, iOLOQL) + "=([^;]*)")), florrie = function(ekamveer, vanessah) {
        ekamveer(++vanessah);
    }, florrie(myldred, emron);
    return hartaj ? decodeURIComponent(hartaj[1]) : undefined;
}
```

有了前面的教训，我们直击要害，我需要返回结果吗？不需要！`hartaj`怎么变化不管，只知道执行了`florrie`，参数`emron`为立即执行函数第二入参，`myldred`在开头定义：

``` js
myldred = function(valerieann) {
    while (--valerieann) {
        oreste.push(oreste.shift());
    }
}, 
```

其中`oreste`正是对应的大字符数组`$dbsm_0x123c`，这里的修改正是混淆手段中的stringArrayIndexShift。因此我们抠出这几段有效代码，真正的立即执行函数如下：

``` js
(function(oreste, emron, myldred){
    myldred = function(valerieann) {
        while (--valerieann) {
            oreste.push(oreste.shift());
        }
    }, 
    myldred(++emron);
}($dbsm_0x123c, 112))
```

## 字符数组读取

处理完数组移位，来看看数组取值函数：

``` js
var $dbsm_0x42c3 = function(dajaha, aubin) {
    qQq01i = "", qoiOlo = 16, dajaha = dajaha - 0, daveney = $dbsm_0x123c[dajaha];
    if ($dbsm_0x42c3.JCBKDb === undefined) { ... 
    chatara = $dbsm_0x42c3.ApEKVq[dajaha];
    if (chatara === undefined) { 
        // ...
        daveney = $dbsm_0x42c3.JhSaco(daveney, aubin), $dbsm_0x42c3.ApEKVq[dajaha] = daveney;
    } else {
        daveney = chatara;
    }
    return daveney;
};
```

这回我们学乖了，直接搜索函数调用，发现只有两个入参，接下来只需要重点找这两个形参参与代码，出现了的地方必然会被执行。从返回值`daveney`开始往上，最后执行了`JhSaco`，第一参数为`$dbsm_0x123c[dajaha]`即从数组中取出的原字符串，第二参数原样传入。函数内容如下：

``` js
montserrath = function(braynt, siyan) {
    kam = [], saanya = 0, janetzi = "", samael = "", braynt = atob(braynt);
    for (alaxandra = 0, rodell = braynt.length; alaxandra < rodell; alaxandra++) {
        samael += "%" + ("00" + braynt.charCodeAt(alaxandra).toString(qoiOlo)).slice(-2);
    }
    braynt = decodeURIComponent(samael);
    for (kaiona = 0; kaiona < 256; kaiona++) {
        kam[kaiona] = kaiona;
    }
    for (kaiona = 0; kaiona < 256; kaiona++) {
        saanya = (saanya + kam[kaiona] + siyan.charCodeAt(kaiona % siyan.length)) % 256, alfy = kam[kaiona], kam[kaiona] = kam[saanya], kam[saanya] = alfy;
    }
    kaiona = 0, saanya = 0;
    for (waqar = 0; waqar < braynt.length; waqar++) {
        kaiona = (kaiona + 1) % 256, saanya = (saanya + kam[kaiona]) % 256, alfy = kam[kaiona], kam[kaiona] = kam[saanya], kam[saanya] = alfy, janetzi += String.fromCharCode(braynt.charCodeAt(waqar) ^ kam[(kam[kaiona] + kam[saanya]) % 256]);
    }
    return janetzi;
}, $dbsm_0x42c3.JhSaco = montserrath,
```

函数`montserrath`的返回值`janetzi`就是最终返回值。从最后一个for循环可见对原值进行了异或、取余操作，具体怎么操作就不管了，只需要保证这个函数执行即可。特别注意的是，其中用到了`atob`和`decodeURIComponent`两个浏览器原生函数，如果在node下调试需要替换为node环境：

``` js
import queryString from 'node:queryString'

let atob = (str) => Buffer.from(str, 'base64').toString('binary');
let decodeURIComponent = (str) => queryString.unescape(str);

var $dbsm_0x42c3 = function(dajaha, aubin) {
    let qQq01i = "", qoiOlo = 16, dajaha = dajaha - 0, daveney = $dbsm_0x123c[dajaha];
    montserrath = function(braynt, siyan) {
        // ...
        return janetzi;
    }, $dbsm_0x42c3.JhSaco = montserrath,
    daveney = $dbsm_0x42c3.JhSaco(daveney, aubin);

    return daveney;
}
```

如果在node中还需要把变量名全补头上，不然报未定义错误，在浏览器中则会自动保存为全局变量。这里找一个调用测试一下：`$dbsm_0x42c3('0x1fd', 'mjVK')`，结果应该是`DrP`。

## 真正的执行函数

接下来是一个大的立即执行函数，解救之道，就在其中。观察主要结构：

``` js
(function $dbsm_0x37d29a(OooIi1, QQQO0q){
    // 1
    OooIi1 = "0x1fd", QQQO0q = "mjVK", ...
    // 2
    janziel = {}, 
    janziel[$dbsm_0x42c3(OooIi1, QQQO0q) + "ad"] = function(kayren, shavina) {
        return kayren === shavina;
    },
    janziel[$dbsm_0x42c3(qQOQo0, OOQQ1I) + "EU"] = $dbsm_0x42c3(qoo1ql, I1LoO1) + "Yu",
    ...
    mehr = janziel,
    // 3
    magdelyn = function() { ...
    }()
    // 4
    , tyla = function() { ...
    }()
    // 5
    function domica() { ... 
    function betsaida() { ...
    // 6
    [$dbsm_0x42c3(QOlqQO, Qq0q1I) + "Fz"](tecola), ooOQOI);
    // 7
    function argo() { ...
    // 8
    mehr[$dbsm_0x42c3(qI0iQO, qLQQQQ) + "uP"](camyrah, mehr.RjlFz(ahleeyah));
}());
```

第一段，变量赋值为十六进制数或字符串，这些变量两个一组将作为上一节中取字符数组元素的参数；第二段，将取出的字符串作为`janziel`对象的属性名或函数名或属性值，而这些函数主要功能是对传入参数进行比较或数值运算；第三、四段，两个立即执行函数；第五、七段，一些函数；第六、八段，执行代码。

我们首先解决繁杂的字符数组调用，将`janziel[$dbsm_0x42c3(iq0ol0, oiOq11) + "KY"]`此类取值的地方全部替换成字符串结果。在console中，首先将第一段的所有字符串变量扣下来，然后对其余的所有代码字符串使用正则替换：

```js
let str = 'mehr[$dbsm_0x42c3(iqOiQ0, QOiq0Q) + "Gk"]'
str.replace(/\$dbsm_0x42c3\((\w{6}),.(\w{6})\)/g, (_, $1, $2)=>{
    // console.log(window[$1], window[$2])
    return `"${$dbsm_0x42c3(window[$1], window[$2])}"`
})
```

所得结果去除`\n`以及字符连接`" + "`，得到了阅读性较好的代码重新封装回原函数，就不需要前面大段字符变量了，甚至前面的字符数组、字符数组偏移、取字符函数也不再需要了，可以单独分析：

```js
(function() {
    janziel = {},
    janziel["DrPad"] = function(kayren, shavina) {
        return kayren === shavina;
    }
    ,
    janziel["SwiEU"] = "pLEYu",
    janziel["EFHQd"] = "eTkNW",
    janziel["KYhGd"] = "fUGmN",
    janziel["QshMZ"] = "人生苦短，何必python？",
    janziel["qsLgw"] = function(teilynn, jennene) {
        return teilynn !== jennene;
    }
    ...
    mehr["VCfuP"](camyrah, mehr.RjlFz(ahleeyah));
}())
```

## debuggerProtection

我们依次分析执行的代码。首先是将在`janziel`中塞了大量字符属性、运算函数，然后传给`mehr`，之后所有的调用都通过`mehr`：

```js
janziel = {},
...
janziel["QshMZ"] = "人生苦短，何必python？",
janziel["RjlFz"] = function(mayukh) {
    return mayukh();
},
...
mehr = janziel,
```

接着是两个立即执行函数`magdelyn`和`tyla`，啊不对，这里仅仅是把立即执行函数的结果复制给了变量，所以还是赋值操作，之后调用时再回看即可。

```js
magdelyn = function() {
    bianeth = {}, ...
    if (mehr["qsLgw"](mehr.RmLGP, mehr.RmLGP)) {
        return false;
    } else {
        zarella = true;
        return function(anterion, zyreion){ ...
            if ...
            else {
                console["log"](adala.zYSeC);
                debugger;
            }
        }
    }
}()
tyla = function() {
    ...
    if (mehr["ldKor"](mehr["YmATX"], mehr["YmATX"])) { 
        if (global) {
            console["log"](mehr["QshMZ"]);
        } else {
            while (1) {
                console["log"](mehr.QshMZ);
                debugger;
            }
        }
    } else {
        auslynn = true;
        return function(ariabella, gates) { ...
        }
    }
}()
```

按照死代码的尿性，这里必然会返回这两个函数进行调用，而且另一个分支竟然出现了`debugger`，想必是判断环境并开启debuggerProtection了。我们跳过debugger直接抽出返回的函数部分。我们继续往下找到执行的地方：

```js
mehr["xaeVQ"](setInterval, mehr["RjlFz"](tecola), ooOQOI);
```

好吧，还是需要前面的一大堆变量的，不嫌麻烦还可以替换一次。这里的值是500，每半秒钟定时执行一次`tecola`，而tecola开始执行的时正调用了以上两个函数：

```js
daden = mehr["qXqVu"](magdelyn, this, function(){
    ...
}),
function() {
    ...
    mehr["lCmHb"](tyla, this, function() {...
    })();
}(),
```

也就是`this`和`function`作为参数传入magdelyn、tyla中，到这里已经有熟悉的味道了，this作为函数上下文对象传入时通常是通过apply或call方法调用函数。回到这两个函数中，发现果然如此：

``` js
// magdelyn
function(anterion, zyreion) {
    sheili = zyreion["apply"](anterion, arguments),zyreion = null;
    return sheili;
}
// tyla
function(ariabella, gates) {
    averill = gates["apply"](ariabella, arguments), gates = null;
    return averill;
}
```

到这里，再分析apply的什么玩意已经不重要啦！这里的返回结果完全没用，其主要目的是进入debuggerProtection，而且是500ms检测一次以防篡改。因此，直接把`tecola`这个大的检测函数干掉，最好是置空或在其他调用的地方直接删掉。

```js
// function tecola() {...}
// mehr["xaeVQ"](setInterval, mehr["RjlFz"](tecola), ooOQOI);
tecola = ()=>'';
```

## cookie生成

干掉debugger后，只剩最后一行执行代码了：

```js
mehr["VCfuP"](camyrah, mehr.RjlFz(ahleeyah));
```

遇到`mehr["xxx"](func, param)`直接视为`func(param)`，在mehr的定义上全是这样的花花函数，另一种则运算是`param1+param2`。查看`ahleeyah`：

```js
function ahleeyah(jerae, bruner) {
    if (mehr["IQzYn"](mehr["wiRbe"], mehr["wiRbe"])) {
        return Date["parse"](new Date);
    } else { ...
}
```

毫无疑问，只会返回`Date["parse"](new Date)`，也意味着之后的加密都会围绕这个时间戳来进行。跟踪`camyrah`：

```js
function camyrah(terricka, antiona) {
    document["cookie"] = mehr.NtDrC(mehr["KGBme"](mehr["KGBme"](mehr["mQKrD"](mehr["mQKrD"](mehr["mQKrD"](Ql1OO0, mehr.zvglw(tecola)), Qoqq0I), mehr["wWbGk"](mandeep, terricka)), lOo0QQ), terricka), mehr["TfZNZ"]),         
    location["reload"]();
}
```

这是最终执行的`document.cookie = 'xxx'`，那这些函数都是字符拼接`+`运算了，只要按照`, `分隔从后往前串就行了。简化后结果是：

```js
document.cookie = 'm' + tecola() + '=' + mandeep(terricka) + '|' + terricka + '; path=/'
```

前面我们已经把检测函数`tecola`干掉了，而且从最终结果看，`m`和`=`之间是没有内容的。继续追踪`mandeep`：

```js
function mandeep(jarlin, ivonne, sarahjo) {
    return ivonne ? sarahjo ? mehr["QNaKk"](jannete, ivonne, jarlin) : mehr.rquKQ(y, ivonne, jarlin) : sarahjo ? mehr["OpVMn"](kjersti, jarlin) : mehr["OpVMn"](shermona, jarlin);
}
```

???莫慌，直接控制台测试一下输出第几个：`0?0?1:2:0?3:4`，结果是最后一个执行。追踪`shermona`：

```js
function shermona(mergeron) {
    return mehr["dJCCX"](roneika, mehr.oOahG(kjersti, mergeron));
}
```

简化后执行的是`roneika(kjersti(mergeron))`，里面的继续跟踪：

``` js
function kjersti(challie){
    return mehr.dJCCX(tarrel, mehr["dJCCX"](gilma, challie));
}
function tarrel(elizebth) {
    return mehr["eQcMs"](makeva, mehr["yramJ"](argo, mehr["eQcMs"](lejin, elizebth), mehr.OnQtT(oq1q0q, elizebth.length)));
}
function gilma(jovee) {
    return mehr["eQcMs"](unescape, mehr["eQcMs"](encodeURIComponent, jovee));
}
...
```

其实到这里就已经差不多了，接下来就是紧张刺激的抠代码环节了，只要牢牢抓住`roneika`和`kjersti`加密函数即可。而最后一个大函数`$dbsm_0x1a0b2e`也是用来检测环境的，在抠加密函数的时候要剔除掉。

Emm...由于牵扯太多，抠不动了，直接尝试运行生成cookie。因为前面已经去掉了debugger，`dbsm_0x1a0b2e`内的防御不会被执行，加密执行过程也没有调用到，但有两个地方报错：`ReferenceError: qz is not defined`，都是在`if (qz)`时引发的。搜索`qz =`，发现是在前面注释掉的`tecola`内定义，而且并没有出现在参数列表中，属于全局变量。而此处判断qz后代码中并未操作qz，因此大胆假设，qz是执行环境检测是产生了全局变量，如果关闭了环境监测，就会导致qz未定义错误，从而使加密出错。那么，只需要在外面定义好：

``` js
let document = {};
let qz = [];
function $dbsm_0x37d29a(){
    ...
        document["cookie"] = ...
        console.log(document);
        // location["reload"]();
    ...
}

// { cookie: 'm=47e8d6bcee3483b8fb04616797a1f76d|1656134875000; path=/' }

```

再运行，cookie成功产生。稍加封装后export给api请求调用。

# 复盘回顾

这一题手撸obfuscator混淆代码，最大的感受是，不要被混淆中的死代码、花指令给迷惑，只要找到真正执行的地方，往上顺藤摸瓜，排除debugger保护代码，思路就能清晰许多。从总体来看，首先需要把stringArray的shift部分找出，这会产生一个新的stringArray；继而分析从字符数组取值的函数，其间通常会把原值进行变换后返回；取值函数将会广泛出现在接下来的立即执行函数中，在console将所有的`getStringArray("0xffff", "OOqq1I")`替换成实际输出字符串，让代码可读性提高，可以窥探到document、global等一些关键信息；立即执行函数内有debuggerProtection代码、setInterval强制关闭console，直接干掉置空，让其他分支永远不进入这部分执行。

在开始分析之前，有必要利用deobfuscator.io等工具将十六进制变量转成常规变量、十六进制数值转成十进制，同时格式化、美化代码，熟练使用VSCode的折叠展开(`Ctrl+Shift+[/]`)，以保持不秃头状态。