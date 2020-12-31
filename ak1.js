

const local_url = 'http://127.0.0.1:8765'
// const SEARCH_FROM = '-deck:English'
const SEARCH_FROM = ''
const MAX_CARS = 37

const URL = local_url

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


// dom
const getHostSearchInputAndTarget = () => {
    /**
     * 获取当前网站的搜索输入框 与 需要插入的位置
     *  */
    let host = window.location.host
    let searchInput = [undefined]  // 搜索框
    let targetDom = [undefined]    // 左边栏的父节点

    let HOST_MAP = new Map([
        ['google', ['.gLFyf', '#rhs']],
        ['bing', ['#sb_form_q', '#b_context']],
        ['yahoo', ['#yschsp', '#right']],
        ['baidu', ['#kw', '#content_right']],
        ['anki', ['.form-control', '#content_right']],
        ['mijisou', ['#q', '#sidebar_results']],
        // ['duckduckgo', ['#search_form_input', '.results--sidebar']],
    ])

    let where = null
    for (let [key, value] of HOST_MAP) {
        if (host.includes(key)) {
            where = key
            searchInput = $(value[0], window.top.document)
            targetDom = $(value[1], window.top.document)
            break
        }
    }

    return [searchInput, targetDom]
}



class Card {
    constructor(id, index, frontCardContent, backCardData) {
        this.id = id
        this.index = index
        this.isExtend = index === 1
        this.frontCardContent = frontCardContent  // strContent
        this.backCardData = backCardData  // [order, field, content]
        this.backCardData.sort((i, j) => i > j ? 1 : -1)

        this._cardHTML = null
        this._title = null
        this.isCollapse = null
    }

    // Getter
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
            let arrows = `<span style="padding-left: 4.5em">↓</span>`
            return arrows + arrows + arrows + arrows
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
                back += `<div class="anki-sub-title"><em>${field}</em></div><div>${content}</div><br>`
            })
        }
        return back
    }

    get templateCard() {
        let template = `
            <div class="anki-card anki-width">
              <div class="anki-title" id="title-${this.id}">
              ${this.title}
              </div>

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
            throw "pls requestCardHTML first"
        }
        return this._cardHTML
    }

    set cardHTML(cardHTML) {
        this._cardHTML = cardHTML
    }

    // Method
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
            let orgImg = `<img src="${filename}" />`
            let replaceImg = `<img class="anki-img-width" src="${base64Img}" />`
            // style="max-width: 500px;" 
            temp = temp.replace(orgImg, replaceImg)
        }))

        return temp
    }

    async requestCardHTML() {
        let templateCard = await this.replaceImg(this.templateCard)
        this.cardHTML = templateCard
        return templateCard
    }

    async collapse(show) {
        if (this.isCollapse === show) {
            return
        } else {
            let hideClass = 'anki-collapsed'
            this.isCollapse = show
            let bodyDom = document.getElementById(`body-${this.id}`)
            if (!show) {
                bodyDom.classList.add(hideClass)
            } else {
                bodyDom.classList.remove(hideClass)
            }
        }
    }

    async listenClickEvent() {
        let titleDom = document.getElementById(`title-${this.id}`)
        titleDom.addEventListener('click', async () => {
            await this.onClick()
        })
    }

    async onClick() {
        let show = !this.isCollapse
        await this.collapse(show)
        window.scroll(window.outerWidth, window.pageYOffset)
    }

}


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
        console.log('Request searchImg Failed', error)
    }
}


async function search(searchText) {
    /**
     * 结合两次请求, 一次完整的搜索
     * searchValue: 搜索框的内容
     */
    if (searchText.length === 0) {
        return
    }
    try {
        let idRes = await _searchByText(searchText)
        ids = idRes.result
        // 只要前37个结果
        ids.length >= MAX_CARS ? ids.length = MAX_CARS : null
        let cardRes = await _searchByID(ids)
        cards = cardRes.result
        log(
            `total req: ${g_counterReqText.next(-1).value + g_counterReqSrc.next(-1).value}\n`,
            `req searchText: ${g_counterReqText.next(-1).value}\n`,
            `req searchSrc: ${g_counterReqSrc.next(-1).value}\n`,
        )
        return cards
    } catch (error) {
        console.log('Request search Failed', error)
    }
}


function formatCardsData(cardsData) {
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
        let card = new Card(id, index+1, frontCard, backCards)
        cards.push(card)
    })
    return cards
}


window.onload = async function () {
    let host = window.location.host
    let cardsData = await search('ascii')
    // let cardsData = await search("拼接字段并删除多余的空格")
    // let cardsData = await search("t")
    // A holiday is a da
    log("cardsData", cardsData)
    let cards = formatCardsData(cardsData)
    console.log("cards", cards)


    // log("11111", cards[0].cardHTML)
    headDom = document.getElementsByTagName("HEAD")[0]
    headDom.insertAdjacentHTML('beforeend', style)
    let parent = document.getElementById('card')
    await Promise.all(cards.map(async (card) => await card.requestCardHTML()))
    cards.forEach(async (card) => {
        // log(card.cardHTML)
        parent.insertAdjacentHTML('beforeend', card.cardHTML)
        await card.listenClickEvent()
        card.collapse(false)
    })

    console.log("onllllllllllload 22")
}


const style = `
  <style>

  /*card*/

  .anki-width {
    min-width: 450px; 
    max-width: 550px; 
  }

  .anki-img-width {
    max-width: 520px; 
  }
 
  .anki-card {
    position: relative;
    display: -ms-flexbox;
    display: flex;
    -ms-flex-direction: column;
    flex-direction: column;
    word-wrap: break-word;
    background-color: #fff;
    background-clip: border-box;
    border: 1.5px solid #dfe1e5;
    width:fit-content; 
    width:-webkit-fit-content;
    width:-moz-fit-content;
    margin-bottom: .4em!important;
    border-radius: .4em!important;
  }

  /* card title */
  .anki-title:first-child {
    border-radius: calc(.25em - 1px) calc(.25em - 1px) 0 0;
    background-color: #c6e1e4!important;
  }

  .anki-title {
    padding: .75em 1.25em;
    margin-bottom: 0;
    border-bottom: 1px solid rgba(0,0,0,.125);
    font-weight: 700!important;
    background-color: #c6e1e4!important;
  }

  .anki-sub-title {
    color: #5F9EA0;
  }

  /* front card*/
  .anki-front-card {
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    padding: .75em 1.25em;
    border-bottom: solid 1px;
    color: #28a745!important;
  }


  /*back card*/
  .anki-back-card:last-child {
    border-radius: 0 0 calc(.25em - 1px) calc(.25em - 1px);
  }

  .anki-back-card {
    padding: .75em 1.25em;
    background-color: rgba(0,0,0,.03);
    border-top: 1px solid rgba(0,0,0,.125);
    background-color: transparent!important;
  }

  .anki-collapsed {
      visibility: hidden;
      display: none;
  }

  </style>
`