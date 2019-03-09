const local_url = 'http://127.0.0.1:8765'

const requiredScript = `
  <link rel="stylesheet" href="https://cdn.staticfile.org/twitter-bootstrap/4.1.0/css/bootstrap.min.css">
  <script src="https://cdn.staticfile.org/jquery/3.2.1/jquery.min.js"></script>
  <script src="https://cdn.staticfile.org/popper.js/1.12.5/umd/popper.min.js"></script>
  <script src="https://cdn.staticfile.org/twitter-bootstrap/4.1.0/js/bootstrap.min.js"></script>
`


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
  // targetDom[0].before(itemDiv[1])
  if(!targetDom[0]) {
    console.log('在页面没找到可依付的元素')
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
  domsArray.forEach(item => {
    father.append(item)
  })
}


const resolveCars = (cards, targetDom) => {
  /**
   * 处理卡片信息
   * cards: array
   *  */ 
  console.log('resolveCars')
  let id, title, frontCard, backCard, show, isFirst, itemDivs
  isFirst = true
  itemDivs = []
  let frontCards = []
  cards.forEach(item => {
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

    frontCards.push(frontCard)
    console.log('0', frontCard)
    let parseTitle = frontCard.split('<div>')
    console.log('1', parseTitle)
    let blanckHead = parseTitle[0].split(/\s+/)
    console.log('2', blanckHead)
    

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
    
    
    let strDiv = templateItem(id, title, frontCard, backCard, show)
    let itemDiv = $.parseHTML(strDiv)
    itemDivs.push(itemDiv)
  })
  console.log('resolveCars end', itemDivs, frontCards)
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
    console.log('init request', count.next() ,cards)
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
            console.log('last request', lastCount.next() ,cards)
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
