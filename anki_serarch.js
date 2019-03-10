// ==UserScript==
// @name         Anki_Search
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  同步搜索Anki上的内容，目前只支持google。依赖AnkiConnect（插件：2055492159）
// @author       Yekingyan
// @run-at       document-start
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @include      https://www.google.com/*
// @include      todohttps://www.bing.com/*
// @include      todohttp://www.bing.com/*
// @include      https://cn.bing.com/*
// @include      todohttps://www.baidu.com/*
// @include      todohttp://www.baidu.com/*
// @include      todohttps://search.yahoo.com/*
// @include      todohttp://search.yahoo.com/*
// @grant        unsafeWindow
// ==/UserScript==

(function() {
  'use strict';
  // Your code here...

//---------------------------------------------------------------------------------

// AnkiConnect（插件：2055492159）的接口
const local_url = 'http://127.0.0.1:8765'

// 图片等资源的路径, 注意windows要将 反斜杠\ 换成 斜杠/
// 需开启 web服务器
const media_path = `C:/Users/y/AppData/Roaming/Anki2/用户1/collection.media/`

// 依赖
const requiredScript = `
  <script src="https://cdn.staticfile.org/jquery/3.2.1/jquery.min.js"></script>
  <style>

/*card*/

.mb-1 {
    margin-bottom: .25rem!important;
}

element.style {
    max-width: 30rem;
}
.mb-1, .my-1 {
    margin-bottom: .25rem!important;
}
.rounded {
    border-radius: .25rem!important;
}

.border-success {
    border-color: #dfe1e5!important;
}

.card {
    position: relative;
    display: -ms-flexbox;
    display: flex;
    -ms-flex-direction: column;
    flex-direction: column;
    min-width: 0;
    word-wrap: break-word;
    background-color: #fff;
    background-clip: border-box;
    border: 1.5px solid #dfe1e5;
    border-radius: .25rem;
}

/* cardheader */
.card-header:first-child {
    border-radius: calc(.25rem - 1px) calc(.25rem - 1px) 0 0;
}
.font-weight-bold {
    font-weight: 700!important;
}

.bg-title {
  background-color: #c6e1e4!important;
}

.card-header {
    padding: .75rem 1.25rem;
    margin-bottom: 0;
    background-color: rgba(0,0,0,.03);
    border-bottom: 1px solid rgba(0,0,0,.125);
}

/*card body*/
.text-success {
    color: #28a745!important;
}
.card-body {
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    padding: .75rem 1.25rem;
    border-bottom: solid 1px;
}

// *, ::after, ::before {
//     box-sizing: border-box;


/*card footer*/
.card-footer:last-child {
    border-radius: 0 0 calc(.25rem - 1px) calc(.25rem - 1px);
}

.border-success {
    border-color: #28a745!important;
}
.bg-transparent {
    background-color: transparent!important;
}
.card-footer {
    padding: .75rem 1.25rem;
    background-color: rgba(0,0,0,.03);
    border-top: 1px solid rgba(0,0,0,.125);
}

.card-footer.bg-transparent.border-success {
  margin-top: 10px;
}

// *, ::after, ::before {
//     box-sizing: border-box;
// }
</style>
`

const media_url = 'file:///' + media_path

let WHERE = ''

const getHostSearchInputAndTarget = () => {
  /**
   * 获取当前网站的搜索输入框 与 需要插入的位置
   *  */
  let host = window.location.host
  let searchInput = undefined
  let targetDom = undefined
  if (host.includes('google')) {
    WHERE = 'google'
    searchInput = $('.gLFyf')
    targetDom = $('#rhs_block')
  } else if (host.includes('bing')) {
    WHERE = 'bing'
    searchInput = $('#sb_form_q')
    targetDom = $('#b_context')
  } else if (host.includes('baidu')) {
    WHERE = 'baidu'
    searchInput = $('#kw')
    targetDom = $('#content_right')
  } else if (host.includes('yahoo')) {
    WHERE = 'baidu'
    searchInput = $('#yschsp')
  }

  return [searchInput, targetDom]
}

const mylog = function () {
  console.log.apply(console, arguments)
}

const commonData = (action, params) => {
  /**
   * 请求的共同数据结构
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


const searchByFileName = (filename) => {
  /**
   * 搜索文件名 返回 资源的base64编码
   * return base64 code
   */

  // gif 太大了，不要
  // if (filename.includes('.gif')) {
  //   return
  // }

  let data = commonData('retrieveMediaFile', {'filename': filename})
  data = JSON.stringify(data)
  const _searchByFileName = new Promise( (resolve, reject) => {
    $.post(local_url, data)
      .done((res) => {
        resolve([filename, res.result])
      })
      .fail((err) => {
        reject(err)
      })
  })
  return _searchByFileName
}

const searchByTest =  (searchText, from='-deck:English') => {
  
    /**
     * 搜索文字返回含卡片ID的数组
     * searchText: str 要搜索的内容
     * from:    str 搜索特定的牌组
     * callback:   array noteIds
     */
    let query = `${from} ${searchText}`
    let data = commonData('findNotes', {'query': query})
    data = JSON.stringify(data)
    const _searchByTest = new Promise( (resolve, reject) => {
      $.post(local_url, data)
        .done((res) => {
          resolve(res.result)
        })
        .fail((err) => {
          reject(err)
        })
    })
  return _searchByTest
}



const searchByIds = (ids) => {
  /**
   * 通过卡片Id获取卡片列表
   * callback: cards array
   */
  let notes = ids
  let data = commonData('notesInfo', {'notes': notes})
  data = JSON.stringify(data)

  const _searchByIds = new Promise( (resolve, reject) => {
    $.post(local_url, data)
      .done((res) => {
        resolve(res.result)
      })
      .fail((err) => {
        reject(err)
      })
  })
  return _searchByIds
}


const search = (canRequest, searchInput, callback) => {
  /**
   * 结合两次请求, 一次完整的搜索
   * searchByTest() --> searchByIds()
   * canRequest: bool 是否请求
   * searchInput: 搜索框dom
   * callback: cards: array
   */

   let searchValue = searchInput.val()
   if (canRequest && searchValue) {
     searchValue = searchInput.val()
     searchByTest(searchValue)
     .then((ids)=> {
       searchByIds(ids).then((cards) => {
         callback(cards)
         console.log('请求次数/2', count.next())
       })
     })
   }
}

function* next_id() {
  /**
   * 计数器，统计每个接口请求的次数
   */
  let current_id = 0
  while (true) {
      current_id++
      yield current_id
  }
}

let count = next_id()
let lastCount = next_id()

let appendTimes = next_id()
let callbackTimes = next_id()

let templateItem = (id, title, frontCard, backCard, show='show')=> {
  let template = `
    <div class="card border-success mb-1 rounded" style="max-width: 40rem;">
      <div class="card-header bg-title font-weight-bold
      collapsed" id="heading${id}" data-toggle="collapse" aria-expanded="false" data-target="#collapse${id}" aria-controls="collapse${id}">
      ${title}
      </div>

      <div class="collapse ${show}"  id="collapse${id}" aria-labelledby="heading${id}" data-parent="#accordionCard">
        <div class="card-body text-success border-success" >${frontCard}</div>
        <div class="card-footer bg-transparent border-success">${backCard}</div>
      </div>

    </div>
  `
  return template
}


// 容器
const container = `<div id="accordionCard"><div>`

const insertContainet = (targetDom) => {
  /**
   *  插入容器到页面
   *  */
  let containerDiv = $.parseHTML(container)
  let father = $('#accordionCard')
  if (!Object.keys(father).length) {
    // 根据不同网站加入容器
    switch (WHERE) {
      case 'google': targetDom[0].before(containerDiv[0])
      break
      case 'bing': targetDom[0].prepend(containerDiv[0])
      break
      case 'baidu': targetDom[0].prepend(containerDiv[0])
      break
    }
  }
}

const insertCards = (domsArray) => {
  /**
   * 将节点插入到页面中
   * domsArray: array dom节点列表
   * targetDom： 要在页面中依附的元素
   */



  // 多次搜索清空旧结果
  let father = $('#accordionCard')
  if (Object.keys(father).length) {
    father.empty()
  }

  // 添加搜索结果到容器内
  let str, imageDom
  domsArray.forEach((item, index) => {
    father.append(item)

    // 卡片加入时只显示标题
     let collapse = $(item).find('.collapse')
     if (index !== 0) {
       collapse.hide()
     } else {
       lastClick = collapse
     }

    // 获取卡片的str， 用于更替src资源
    str = $(item[1]).html()
    collectSrc(str, (filename, data) => {
      imageDom = $(`img[src="${filename}"]`)
      // dom 更替src属性
      imageDom.attr('src', data)
      //样式 限制图片大小
      imageDom.attr('style', 'max-height: 450px; max-width: 517px;')
    })
  })
}

const getTittleFromFrontCard = (index, frontCard) => {
  /**
   * 通过FrontCard生成简短的标题, 
   * 并根据标题重新定义frontCard
   */
  let title = ''
  let parseTitle = frontCard.split(/<div.*?>/)
  let blanckHead = parseTitle[0].split(/\s+/)
  //有div的情况
  if(frontCard.includes('</div>')) {
    // 第一个div之前不是全部都是空白，就是标题
    if (!/^\s+$/.test(blanckHead[0]) && blanckHead[0] !== '') {
      title = blanckHead
    } else {
      // 标题是第一个div标签的内容
      title = parseTitle[1].split('</div>')[0]
    }
  } else {
    //没有div的情况
    title = frontCard
    let arrows = `<span style="padding-left: 4.5em">↓</span>`
    frontCard = arrows + arrows + arrows + arrows
  }
  title = index + '、' + title
  return [frontCard, title]
}


const src_base64 = (base64) => {
  let src = `
    data:image/png;base64,${base64}
  `
  return src
}



const replaceDivSrc = (str, s_b_map) => {
  /**
   * 更替div中的src属性
   */
  let tempStr = str
  for (let i of s_b_map) {
    tempStr = tempStr.replace(i[0], i[i])
  }
  return tempStr
}


const collectSrc = (str, callback) => {
  /**
   * 将str资源文件名，提取出来, 并对应base64资源
   * callback filename, base64
   */
  let src, base64, data

  // 找出 src="**.jpg"
  let re_src = /src="(.*?)"/gm
  let srcsList = str.match(re_src)
  
  if (!srcsList) {
    // 没有资源的卡片
    return str
  }

  // 找出**.jpg
  let filename
  srcsList.forEach(item => {
    filename = item.split('"')[1].split('"')[0]
    // 查文件询名对应的资源
    searchByFileName(filename).then(results => {
      // src -> data
      base64 = results[1]
      data = src_base64(base64)
      // data replace src
      callback(results[0], data)
      
    })
  })
}


const resolveCars = (cards, targetDom) => {
  /**
   * 处理卡片信息
   * cards: array
   *  */ 
  let id, title, frontCard, backCard, show, isFirst, itemDivs
  isFirst = true
  itemDivs = []
  cards.forEach((item, index) => {
    if (isFirst) {
      // 是否展开，展开第一个
      show = 'show'
      isFirst = false
    } else {
      show = ''
    }

    id = item.noteId
    frontCard = item.fields.正面.value
    backCard = item.fields.背面.value
    ;([frontCard, title] = getTittleFromFrontCard(index+1, frontCard))
    
    let strDiv = templateItem(id, title, frontCard, backCard, show)
    let itemDiv = $.parseHTML(strDiv)
    itemDivs.push(itemDiv)
  })
  // 处理收集的itemDivs，插入到页面中
  insertCards(itemDivs)
}

// 记录最后一次显示或隐藏的卡片
let lastClick

$(document).ready(() => {

  // 获取输入框 与 搜索值
  let [searchInput, targetDom] = getHostSearchInputAndTarget()

  // 终止搜索
  if (!searchInput[0]) {
    console.log('在页面没有找到搜索框')
    return
  }
  if(!targetDom[0]) {
    console.log('在页面没有找到可依附的元素', targetDom)
    return
  }


  // 注入脚本
  let html = $.parseHTML(requiredScript,document, true)
  $('body').append(html)

  // 插入容器到页面
  insertContainet(targetDom)


  // 刷新，搜索一次
  search(true, searchInput, (cards) => {
    resolveCars(cards)
  })
  

  // 监听输入框的搜索事件
  let canRequest = false  // 用于控制是否请求
  let lastSearchText = '' // 最新一次请求的搜索的参数
  if (searchInput) {
    searchInput.on({

      // 有输入行为
      input: function() {
      // search from ANKI
        let eventTime = Date.parse(new Date())
        // 减少请求次数
        if (lastSearchText !== searchInput.val()) {
          // 相同的内容就不请求了
          setTimeout(() => {
            canRequest = !canRequest
            let lastTime = Date.parse(new Date())
            if (lastTime-eventTime > 1000) {
              // 1秒内没有新的事件触发，必发一次结合请求
              lastSearchText = searchInput.val()
              search(canRequest, searchInput, (cards) => {
                console.log('inputEven request', searchInput.val(), lastCount.next() ,cards)
                resolveCars(cards)
              })
            }
          },1500)
        }
      },

      // 失焦触发请求
      change: function() {
        if (lastSearchText !== searchInput.val()) {
          search(true, searchInput, (cards) => {
            resolveCars(cards)
          })
        }
      }
  })
  }

  // 控制卡片风手琴
  $('#accordionCard').on('click', '.collapsed', function (event) {
    let cardTitle = $(event.target)
    let targetId = cardTitle.data('target')
    let collapse = $(targetId)
    
    //目标元素的显示与隐藏
    collapse.toggle()
    collapse.toggleClass('show')

    // 上一个元素的隐藏，如果是自身则不操作
    if (lastClick && lastClick.attr('id') !== collapse.attr('id')) {
      // 如果有 show的class 则去掉并隐藏
      lastClick.hide()
      lastClick.removeClass('show')
    }
    
    // 如果目标卡片是打开状态，标志
    if (collapse.hasClass('show')) {
      lastClick = collapse
    }
    
})

})

/**
 * div class="med" id="res" 左侧搜索结果
 * 左边 rhs_block
 * 
 * 
 * <iframe src="chrome-extension://pioclpoplcdbaefihamjohnefbikjilc/SimSearchFrame.html" id="simSearchFrame" style="width: 454px; height: 265px; border: none;"></iframe>
 * 
 */

const test = (condition, e) => {
  if(!condition) {
    console.log(e)
  }
}

// TODO: 其它网站适配
//-----------------------------------------------------------------------

})();