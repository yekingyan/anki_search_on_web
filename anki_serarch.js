let local_url = 'http://127.0.0.1:8765'


let getHostSearchInput = () => {
  /**
   * 获取当前网站的搜索输入框
   *  */
  let host = window.location.host
  let searchInput = undefined
  if (host.includes('google')) {
    searchInput = $('.gLFyf')
  } else if (host.includes('bing')) {
    searchInput = $('.b_searchbox')
  } else if (host.includes('baidu')) {
    searchInput = $('#kw')
  } else if (host.includes('yahoo')) {
    searchInput = $('#yschsp')
  }

  return searchInput
}

let commonData = (action, params) => {
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
     * return:   array noteIds
     */
    let query = `${from} ${searchText}`
    let data = commonData('findNotes', {'query': query})
    data = JSON.stringify(data)
    const _searchByTest = new Promise( (resolve, reject) => {
      $.post(local_url, data)
        .done((res) => {
          console.log('promise', res.result)
          resolve(res.result)
        })
        .fail((err) => {
          reject(err)
        })
    })
  return _searchByTest
}



let searchByIds = (ids) => {
  /**
   * 通过卡片Id获取卡片列表
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


$(document).ready(() => {
  // 获取输入框
  let searchInput = getHostSearchInput()
  // 监听事件
  if (searchInput) {
    searchInput.on('keyup', () => {
      let searchValue = searchInput.val()
      searchByTest(searchValue)
        .then((ids)=> {
          searchByIds(ids).then((cards) => {
            console.log(cards)
          })
        })
      
    })
  }

})