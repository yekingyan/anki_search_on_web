## Anki Search On The Web Page
## 在网页上同步搜索本地的的Anki数据

---
### 效果展示(目前适配google、 bing、yahoo、百度)
![image](https://github.com/yekingyan/anki_search_on_web/raw/master/display.gif)

### 安装
#### 1、安装AnkiConnect插件
在本地Anki软件上安装[AnkiConnect插件](https://ankiweb.net/shared/info/2055492159)，（安装code：2055492159）
安装完成后，重启anki。
注：anki在启动状态下才能使用本脚本

##### 1.1 AnkiConnect 配置
新版本AnkiConnect需要配置跨域，否则有报错
![image](https://github.com/yekingyan/anki_search_on_web/raw/master/ak-cfg.png)

#### 2、浏览器安装Tampermonkey
[anki_search_on_web](https://github.com/yekingyan/anki_search_on_web/blob/master/anki_serarch.js)是油猴脚本，添加完刷新一下，就可以用了


如何使用 Tampermonkey?
[用 Chrome 的人都需要知道的「神器」扩展：「油猴」使用详解](https://sspai.com/post/40485)


##### 2.1 Tampermonkey 添加本脚本

#### 3、结束，Enjoy。
    ps: 如果百度看不到卡片。F5刷新一下

#### 4、可选配置(非必须)

##### 4.1 搜索范围
默认搜索全部（排除了'English'牌组）
你可以在脚本中自定义修改，规则与客户端搜索一样

```js
// 搜索范围设置
// 只搜English牌组，'deck:English'
// 排除English牌组，'-deck:English'
const SEARCH_FROM = ''
```

比如
```js
const SEARCH_FROM = 'deck:MyDecks'
```

##### 4.2 卡片数量与大小

// a maximun of cards
const MAX_CARDS = 37

// set card size
const MIN_CARD_WIDTH = 30
const MAX_CARD_WIDTH = 40
const MAX_CARD_HEIGHT = 70
