# 题目信息

* 题目地址：https://match.yuanrenxue.com/match/4

* 提交请求：

``` js
GET /api/match/4 HTTP/2
Host: match.yuanrenxue.com
```

* 正确响应：

``` json
{
  "status": "1",
  "state": "success",
  "key": "a1w2I3Icfz",
  "value": "IA1ndviFm5",
  "iv": "jlewo",
  "info": "<td><img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA..."
}
```

# 解题过程

## 定位偏移

这题没有debugger。请求结果中的`info`为`td`嵌套`img`，每个img源地址都是数字0-9的图片的base64编码。而每一组`<td></td>`内的数个`img`数字组成一组数值，也就是说需要获取的数值由一组数字图片按顺序拼接而成，而非普通文本。除此之外，每个`img`标签添加了样式诸如`style=left:-11.5px`，这个偏移量决定了该图片相对于原来位置的移动距离。很熟悉啊，之前做过的[当当网电子书获取](https://98112.xyz/2021/04/16/2021-04-16-dangdang-crawler/)就是一模一样的做法：页面内的每一个文字的显示顺序都被打乱顺序，按照`position`定位在渲染时重新排列，不能按照源码中的标签顺序直接进行拼接。有了前车之鉴，这题就非常简单了，只需要获取原数组，偏移数组，按偏移重新排列即可：

```js
origin: [6, 8, 0, 1]
offset: [0, 1, -1, 0]
realset:[6, 0, 8, 1]
```

那如何根据原数组和偏移数组得到真实数组呢？偏移0代表保持不动，偏移1代表需要右移1个元素位置，-1代表需要左移1个元素位置，那么偏移后的位置就是：`i+offset`，`i`为当前元素索引。简单实现如下：

```js
let numList = [6, 8, 0, 1]
let offsetList = [0, 1, -1, 0]
let newNumList = [0, 0, 0, 0]
for (let i = 0; i < numList.length; i++) {
    newNumList[i + offsetList[i]] = numList[i]
}
```

## 数组解析

因为需要从html字符串中解析出数组，可以使用DOM-parser工具如`jsdom`直接生成dom，然后以`dom.document.querySelector`的方式操作DOM类数组和属性值。另一种方式就是regex直接干了。

中间使用`RegExp.exec`时发现了之前没有注意到的细节。使用`RegExp.exec(str)`并不会一次性返回所有的匹配结果，而使用`str.match(RegExp)`可以返回所有匹配结果。在js红宝书上对这两个方法的描述是“本质上相同”，查阅资料才发现在非全局模式下是一样的，而全局模式下则不同：

``` js
let reg = new RegExp('a')
let str = 'abc, abc'
reg.exec(str) // ['a', index: 0]
str.match(reg) // ['a', index: 0]

reg = new RegExp('a', 'g')
reg.exec(str) // ['a', index: 0]
str.match(reg) // ['a', 'a']
```

在全局模式下，每次执行`exec`只会返回一个结果，只有继续循环执行直到结果为null才算匹配完全：

```js
reg.exec(str) // ['a', index: 5]
reg.exec(str) // null
```

参考阅读：[JavaScript exec() 方法](https://www.w3school.com.cn/jsref/jsref_exec_regexp.asp)

## 隐类排除

在接口返回结果中，还包含了`key`、`value`、`kv`，ajax请求成功时的data处理过程如下：

```js
success: function(data) {
    datas = data.info;
    $('.number').text('').append(datas);
    var j_key = '.' + hex_md5(btoa(data.key + data.value).replace(/=/g, ''));
    $(j_key).css('display', 'none');
    $('.img_number').removeClass().addClass('img_number')
},
```

首先base64加密`k+v`，然后`hex_md5`计算哈希，作为隐类名将对应的标签设为hidden。最后移除将`img_number`类标签移除所有类，再加上`img_number`类。这个过程的最终结果是所有`img`都只有一个类，不过有些样式被设为隐藏。这样做的目的是，实际的接口返回结果中每个img标签都是有一个md5值的类，由`k+v`计算得到的类标签被隐藏，因此需要对原始数组过滤隐藏值。

# 复盘回顾

这题将数值类型的内容转为图片，并利用css-position进行乱序，可能出现在页面价格保护、评分等场景，因为数值只需要0-9即可表示，任何数值都能组合得到。之前分析过的当当网图书乱序，每一页书中的文字、符号都是乱序，后端混淆的代价相当大，也会给前端渲染带来额外负担。另外，图片数字在显示时会和页面中其他元素的颜色、大小等产生明显的差异甚至失真，不利于主题切换等场景。