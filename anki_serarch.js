// ==UserScript==
// @name         Anki_Search
// @namespace    https://github.com/yekingyan/anki_search_on_web/
// @version      1.0
// version log   支持多种卡片模板了。去除了外部依赖，修复一些兼容性问题
// @description  同步搜索Anki上的内容，支持google、bing、yahoo、百度。依赖AnkiConnect（插件：2055492159）
// @author       Yekingyan
// @run-at       document-start
// @include      *://www.google.com/*
// @include      *://www.google.com.*/*
// @include      *://www.google.co.*/*
// @include      *://mijisou.com/*
// @include      *://*.bing.com/*
// @include      *://search.yahoo.com/*
// @include      *://www.baidu.com/*
// @include      *://ankiweb.net/*
// @grant        unsafeWindow
// ==/UserScript==

const URL = 'http://127.0.0.1:8765'
const SEARCH_FROM = '-deck:English'
const MAX_CARDS = 37

// set card size
const MIN_CARD_WIDTH = 30
const MAX_CARD_WIDTH = 40
const MAX_CARD_HEIGHT = 70

// adaptor
const HOST_MAP = new Map([
    ['local', ['#anki-q', '#anki-card']],
    ['google', ['.gLFyf', '#rhs']],
    ['bing', ['#sb_form_q', '#b_context']],
    ['yahoo', ['#yschsp', '#right']],
    ['baidu', ['#kw', '#content_right']],
    ['anki', ['.form-control', '#content_right']],
    ['mijisou', ['#q', '#sidebar_results']],
    // ['duckduckgo', ['#search_form_input', '.results--sidebar']],
])


const MAX_IMG_WIDTH = MAX_CARD_WIDTH - 3

// utils
const log = function () {
    console.log.apply(console, arguments)
}


function* counter() {
    /**
     * 计数器，统计请求次数
     */
    let val = 0
    let skip = 0
    while (true) {
        skip = yield val
        val = val + 1 + (skip === undefined ? 0 : skip)
    }
}
let g_counterReqText = counter()
let g_counterReqSrc = counter()
g_counterReqText.next()
g_counterReqSrc.next()


class Card {
    constructor(id, index, frontCardContent, backCardData, parent) {
        this.id = id
        this.index = index
        this.isfirstChild = index === 1
        this.frontCardContent = frontCardContent  // strContent
        this.backCardData = backCardData  // [order, field, content]
        this.backCardData.sort((i, j) => i > j ? 1 : -1)
        this.parent = parent

        this._cardHTML = null
        this._title = null
        this.isExtend = null
        this.bodyDom = null
        this.titleDom = null
    }

    get title() {
        let title = ''
        let parseTitle = this.frontCardContent.split(/<div.*?>/)
        let blankHead = parseTitle[0].split(/\s+/)
        //有div的情况
        if (this.frontCardContent.includes('</div>')) {
            // 第一个div之前不是全部都是空白，就是标题
            if (!/^\s+$/.test(blankHead[0]) && blankHead[0] !== '') {
                title = blankHead
            } else {
                // 标题是第一个div标签的内容
                title = parseTitle[1].split('</div>')[0]
            }
        } else {
            //没有div的情况
            title = this.frontCardContent
        }
        this._title = title
        title = this.index + '、' + title
        return title
    }

    get forntCard() {
        if (this._title === this.frontCardContent) {
            let arrow = `<span style="padding-left: 4.5em;">↓</span>`
            let arrows = ''
            for (let index = 0; index < 4; index++) {
                arrows = arrows + arrow
            }
            return `<div style="text-align: center;">↓${arrows}</div>`
        }
        return this.frontCardContent
    }

    get backCard() {
        let back = ''
        if (this.backCardData.length <= 1) {
            back += this.backCardData[0][2]
        } else {
            this.backCardData.forEach(item => {
                let order, field, content
                [order, field, content] = item
                if (content.length > 0) {
                    back += `<div class="anki-sub-title"><em>${field}</em></div>
                             <div calss="anki-sub-back-card">${content}</div><br>`
                }
            })
        }
        return back
    }

    get templateCard() {
        let template = `
            <div class="anki-card anki-card-size">
              <div class="anki-title" id="title-${this.id}">${this.title}</div>
              <div class="anki-body" id="body-${this.id}">
                <div class="anki-front-card">${this.forntCard}</div>
                <div class="anki-back-card">${this.backCard}</div>
              </div>
            </div>
            `
        return template
    }

    get cardHTML() {
        if (!this._cardHTML) {
            throw "pls requestCardSrc first"
        }
        return this._cardHTML
    }

    set cardHTML(cardHTML) {
        this._cardHTML = cardHTML
    }

    async replaceImg(templateCard) {
        let reSrc = /src="(.*?)"/g
        let reFilename = /src="(?<filename>.*?)"/
        let srcsList = templateCard.match(reSrc)
        let temp = templateCard

        if (!srcsList) {
            return temp
        }

        await Promise.all(srcsList.map(async (i) => {
            let filename = i.match(reFilename).groups.filename
            let res = await searchImg(filename)
            let base64Img = formatBase64Img(res)
            let orgImg = `<img src="${filename}"`
            let replaceImg = `<img class="anki-img-width" src="${base64Img}"`
            temp = temp.replace(orgImg, replaceImg)
        }))

        return temp
    }

    async requestCardSrc() {
        let templateCard = await this.replaceImg(this.templateCard)
        this.cardHTML = templateCard
        return templateCard
    }

    showSelTitleClass(show) {
        let selTitleClass = 'anki-title-sel'
        show 
            ? this.titleDom.classList.add(selTitleClass)
            : this.titleDom.classList.remove(selTitleClass)
    }

    setExtend(show) {
        if (this.isExtend === show) {
            return
        } else {
            let hideClass = 'anki-collapsed'
            let showClass = 'anki-extend'
            if (show) {
                this.bodyDom.classList.add(showClass)
                this.bodyDom.classList.remove(hideClass)
            } else {
                this.bodyDom.classList.add(hideClass)
                this.bodyDom.classList.remove(showClass)
            }

            this.isExtend = show
            this.showSelTitleClass(show)
        }
    }

    tryCollapse() {
        if (!this.isfirstChild) {
            this.setExtend(false)
            return
        }
        this.isExtend = true
        this.showSelTitleClass(true)
    }

    listenEvent() {
        this.titleDom = window.top.document.getElementById(`title-${this.id}`)
        this.titleDom.addEventListener('click', () => {
            this.onClick()
        })

        this.bodyDom = window.top.document.getElementById(`body-${this.id}`)
        this.bodyDom.addEventListener("animationend", () => {
            if (this.isExtend) {
                window.scroll(window.outerWidth, window.pageYOffset)
            }
        })
    }

    onClick() {
        this.parent.onCardClick(this)
        let show = !this.isExtend
        this.setExtend(show)
    }

}


class CardMgr {
    constructor () {
        this.cards = []
    }

    formatCardsData(cardsData) {
        /** turn cardData 2 cardObj */
        let cards = []
        cardsData.forEach((item, index) => {
            let id = item.noteId
            let frontCard = []
            let backCards = []
            for (const [k, v] of Object.entries(item.fields)) {
                if (v.order === 0) {
                    frontCard = v.value
                    continue
                }
                backCards.push([v.order, k, v.value])
            }
            let card = new Card(id, index+1, frontCard, backCards, this)
            cards.push(card)
        })
        return cards
    }

    insertCardsDom(cards) {
        clearContainer()
        cards.forEach(card => {
            getContainer().insertAdjacentHTML('beforeend', card.cardHTML)
            card.listenEvent()
            card.tryCollapse()
        })
    }

    async searchAndInsertCard(searchValue) {
        let cardsData = await search(searchValue)
        let cards = this.formatCardsData(cardsData)
        this.cards = cards
        await Promise.all(cards.map(async (card) => await card.requestCardSrc()))
        this.insertCardsDom(cards)
        log(
            `total req: ${g_counterReqText.next(-1).value + g_counterReqSrc.next(-1).value}\n`,
            `req searchText: ${g_counterReqText.next(-1).value}\n`,
            `req searchSrc: ${g_counterReqSrc.next(-1).value}\n`,
        )
    }

    onCardClick(curCard) {
        this.cards.forEach( card => {
            if (card !== curCard) {
                card.setExtend(false)
            }
        })
    }

}


let cardMgr = new CardMgr()


// request and data
const commonData = (action, params) => {
    /**
     * 请求表单的共同数据结构
     * action: str findNotes notesInfo
     * params: dict
     * return: dict
     */    
    return {
        "action": action,
        "version": 6,
        "params": params
    }
}


async function _searchByText(searchText) {
    /**
     * 通过文本查卡片ID
     */
    let query = `${SEARCH_FROM} ${searchText}`
    let data = commonData('findNotes', { 'query': query })
    try {
        let response = await fetch(URL, {
            method: 'POST',
            body: JSON.stringify(data)
        })
        g_counterReqText.next()
        return await response.json()
    } catch (error) {
        console.log('Request searchByText Failed', error)
    }
}


async function _searchByID(ids) {
    /**
     * 通过卡片ID获取卡片内容
     */
    let data = commonData('notesInfo', { 'notes': ids })
    try {
        let response = await fetch(URL, {
            method: 'POST',
            body: JSON.stringify(data)
        })
        g_counterReqText.next()
        return await response.json()
    } catch (error) {
        console.log('Request searchByID Failed', error)
    }
}


function formatBase64Img(base64) {
    let src = `data:image/png;base64,${base64}`
    return src
}


async function searchImg(filename) {
    /**
     * 搜索文件名 返回 资源的base64编码
     * return base64 code
     */
    let data = commonData('retrieveMediaFile', { 'filename': filename })
    try {
        let response = await fetch(URL, {
            method: 'POST',
            body: JSON.stringify(data)
        })
        res = await response.json()
        g_counterReqSrc.next()
        return res.result
    } catch (error) {
        log('Request searchImg Failed', error, filename)
    }
}


async function search(searchText) {
    /**
     * 结合两次请求, 一次完整的搜索
     * searchValue: 搜索框的内容
     */
    if (searchText.length === 0) {
        return []
    }
    try {
        let idRes = await _searchByText(searchText)
        ids = idRes.result
        ids.length >= MAX_CARDS ? ids.length = MAX_CARDS : null
        let cardRes = await _searchByID(ids)
        cards = cardRes.result
        return cards
    } catch (error) {
        log('Request search Failed', error, searchText)
    }
}


// dom
const getHostSearchInputAndTarget = () => {
    /**
     * 获取当前网站的搜索输入框 与 需要插入的位置
     *  */
    let host = window.location.host || 'local'
    let searchInput = null  // 搜索框
    let targetDom = null    // 左边栏的父节点

    for (let [key, value] of HOST_MAP) {
        if (host.includes(key)) {
            searchInput = window.top.document.querySelector(value[0])
            targetDom = window.top.document.querySelector(value[1])
            break
        }
    }

    return [searchInput, targetDom]
}


const CONTAINER_ID = 'anki-container'
const CONTAINER = `<div id="${CONTAINER_ID}"><div>`
function insertContainet(targetDom) {
    targetDom.insertAdjacentHTML('afterbegin', CONTAINER)
}


function getContainer() {
    return window.top.document.getElementById(CONTAINER_ID)
}

function clearContainer() {
    getContainer().innerHTML = ''
}


// listen input
function addInputEventListener(searchInput) {
    function onSearchTextInput(event) {
        lastInputTs = event.timeStamp
        searchText = event.srcElement.value
        setTimeout(() => {
            if (event.timeStamp === lastInputTs) {
                cardMgr.searchAndInsertCard(searchText)
            }
        }, 700)

    }
    let lastInputTs, searchText
    searchInput.addEventListener('input', onSearchTextInput)
}


async function main() {
    // 注入css
    let headDom = window.top.document.getElementsByTagName("HEAD")[0]
    headDom.insertAdjacentHTML('beforeend', style)

    // 获取输入框 与 容器挂载点
    let [searchInput, targetDom] = getHostSearchInputAndTarget()
    if (!searchInput) {
        log('在页面没有找到搜索框', searchInput)
        return
    }
    if (!targetDom) {
        log('在页面没有找到可依附的元素', targetDom)
        return
    }

    insertContainet(targetDom)
    addInputEventListener(searchInput)

    // 刷新，搜索一次
    let searchText = searchInput.value
    cardMgr.searchAndInsertCard(searchText)
}


window.onload = main


const style = `
  <style>
  /*card*/
  .anki-card-size {
    min-width: ${MIN_CARD_WIDTH}em; 
    max-width: ${MAX_CARD_WIDTH}em;
    max-height: ${MAX_CARD_HEIGHT}em;
  }

  .anki-img-width {
    max-width: ${MAX_IMG_WIDTH}em; 
  }
 
  .anki-card {
    position: relative;
    display: -ms-flexbox;
    display: flex;
    -ms-flex-direction: column;
    flex-direction: column;
    word-wrap: break-word;
    width:fit-content; 
    width:-webkit-fit-content;
    width:-moz-fit-content;
    margin-bottom: .25em;
    border: .1em solid #69928f;
    // border-radius: calc(.7em - 1px);
    border-radius: .7em;
  }

  .anki-body {
    overflow-x: visible;
    overflow-y: auto;
  }

  /* card title */
  .anki-title {
    padding: .75em;
    margin: 0em;
    font-weight: 700;
    background-color: #e0f6f9;
    // border-radius: calc(.5em - 1px);
    border-radius: .7em;

    transition-property: all;
    transition-duration: 1.5s;
    transition-timing-function: ease-out;
  }

  .anki-title-sel {
      animation-name: select-title;
      animation-duration: 5s;
      animation-iteration-count: infinite;
      animation-direction: alternate;
  }

  .anki-title:hover{
    // background-color: #9791b1;
    background-color: #d2e4f9;
  }

  .anki-sub-title {
    color: #5F9EA0;
  }

  .anki-front-card {
    padding: .75em;
    border-bottom: solid .3em #c6e1e4;
  }

  .anki-back-card {
    padding: .75em .75em;
  }

  .anki-collapsed {
    overflow: hidden;
    animation-name: collapsed;
    animation-duration: .3s;
    animation-timing-function: ease-out;
    animation-fill-mode:forwards;
    animation-direction: normal;
  }

  .anki-extend {
    overflow-x: visible;
    animation-name: extend;
    animation-duration: .3s;
    animation-timing-function: ease-in;
    animation-fill-mode:forwards;
    animation-direction: normal;
  }

  @keyframes collapsed
    {
      0%   {max-height: ${MAX_CARD_HEIGHT}em; max-width: ${MAX_CARD_WIDTH}em;}
      100% {max-height: 0em; max-width: 30em;}
    }

  @keyframes extend
    {
      0%   {max-height: 0em; max-width: ${MIN_CARD_WIDTH}em;}
      100% {max-height: ${MAX_CARD_WIDTH}em; max-width: ${MAX_CARD_WIDTH}em;}
    }

  @keyframes select-title
    {
      0%   {background: #e0f6f9;}
      50%  {background: #e1ddf3;}
      100% {background: #d2e4f9;}
    }

  </style>
`
