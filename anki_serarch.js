// AnkiConnect（插件：2055492159）的接口
const local_url = 'http://127.0.0.1:8765'

// 图片等资源的路径, 注意windows要将 反斜杠\ 换成 斜杠/
// 需开启 web服务器
const media_path = `C:/Users/y/AppData/Roaming/Anki2/用户1/collection.media/`

// 依赖
const requiredScript = `
  <link rel="stylesheet" href="https://cdn.staticfile.org/twitter-bootstrap/4.1.0/css/bootstrap.min.css">
  <script src="https://cdn.staticfile.org/jquery/3.2.1/jquery.min.js"></script>
  <script src="https://cdn.staticfile.org/popper.js/1.12.5/umd/popper.min.js"></script>
  <script src="https://cdn.staticfile.org/twitter-bootstrap/4.1.0/js/bootstrap.min.js"></script>
`

const media_url = 'file:///' + media_path



const getHostSearchInputAndTarget = () => {
  /**
   * 获取当前网站的搜索输入框 与 需要插入的位置
   *  */
  let host = window.location.host
  let searchInput = undefined
  let targetDom = undefined
  if (host.includes('google')) {
    searchInput = $('.gLFyf')
    targetDom = $('#rhs_block')
  } else if (host.includes('bing')) {
    searchInput = $('.b_searchbox')
  } else if (host.includes('baidu')) {
    searchInput = $('#kw')
  } else if (host.includes('yahoo')) {
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
    <div class="card border-success mb-1 rounded" style="max-width: 30rem;">
      <div class="card-header bg-transparent border-primary font-weight-bold
      collapsed" id="heading${id}" data-toggle="collapse" aria-expanded="false" data-target="#collapse${id}" aria-controls="collapse${id}">
      ${title}
      </div>

      <div class="collapse ${show}"  id="collapse${id}" aria-labelledby="heading${id}" data-parent="#accordionCard">
        <div class="card-body text-success" >${frontCard}</div>
        <div class="card-footer bg-transparent border-success">${backCard}</div>
      </div>

    </div>
  `
  return template
}



const container = `<div id="accordionCard"><div>`

const insertCards = (domsArray, targetDom) => {
  /**
   * 将节点插入到页面中
   * domsArray: array dom节点列表
   * targetDom： 要在页面中依附的元素
   */

  if(!targetDom[0]) {
    console.log('在页面没找到可依附的元素')
    return
  }

  // 加入容器到页面
  let containerDiv = $.parseHTML(container)
  let father = $('#accordionCard')
  if (!Object.keys(father).length) {
    targetDom[0].before(containerDiv[0])
    father = $('#accordionCard')
  } else {
    // 多次搜索清空旧结果
    father.empty()
  }

  // 添加搜索结果到容器内
  let str, imageDom
  domsArray.forEach(item => {
    father.append(item)

    // 获取卡片的str， 用于更替src资源
    str = $(item[1]).html()
    collectSrc(str, (filename, data) => {
      imageDom = $(`img[src="${filename}"]`)
      // dom 更替src属性
      imageDom.attr('src', data)
      //样式 限制图片大小
      imageDom.attr('style', 'max-height: 450px;')
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
  insertCards(itemDivs, targetDom)
}


$(document).ready(() => {
  // 获取输入框 与 搜索值
  let [searchInput, targetDom] = getHostSearchInputAndTarget()

  // 注入脚本
  if (searchInput) {
    let html = $.parseHTML(requiredScript,document,true )
    $('body').append(html)
  }

  search(true, searchInput, (cards) => {
    resolveCars(cards, targetDom)
  })
  
  // 用于控制是否请求
  let canRequest = false

  // 监听事件
  if (searchInput) {
    searchInput.on('keyup', () => {
      // search from ANKI

      let eventTime = Date.parse(new Date())

      // 减少请求次数
      setTimeout(() => {
        canRequest = !canRequest
        let lastTime = Date.parse(new Date())
        if (lastTime-eventTime > 1000) {
          // 1秒内没有新的事件触发，必发一次结合请求
          search(canRequest, searchInput, (cards) => {
            console.log('last request', searchInput.val(), lastCount.next() ,cards)
            resolveCars(cards, targetDom)
          })
        }
      },1500)

    })
  }

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

// TODO: 布局，图片大小