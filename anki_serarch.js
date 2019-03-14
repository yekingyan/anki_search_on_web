// ==UserScript==
// @name         Anki_Search
// @namespace    https://github.com/yekingyan/anki_search_on_web/
// @version      0.5
// @description  同步搜索Anki上的内容，支持google、bing、yahoo、百度。依赖AnkiConnect（插件：2055492159）
// @author       Yekingyan
// @run-at       document-start
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @include      https://www.google.com/*
// @include      https://www.bing.com/*
// @include      http://www.bing.com/*
// @include      https://cn.bing.com/*
// @include      https://search.yahoo.com/*
// @include      https://www.baidu.com/*
// @include      http://www.baidu.com/*
// @include      https://ankiweb.net/*
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict'
    //---------------------------------------------------------------------------------

    // AnkiConnect（插件：2055492159）的接口
    const local_url = 'http://127.0.0.1:8765'

    // 搜索范围设置
    // 只搜English牌组，'deck:English'
    // 排除English牌组，'-deck:English'
    const SEARCH_FROM = ''

    // 卡页类型，正反面的名称
    // 默认supermemo不用设置
    // 目前只持支取两个字段
    const FRONT_CARCD_FILES = ''
    const BACK_CARK_FILES = ''

    // 依赖
    const requiredScript = `
  <script src="https://cdn.staticfile.org/jquery/3.2.1/jquery.min.js"></script>
  <style>

  /*card*/

  .anki-mb-1 {
    margin-bottom: .25rem!important;
  }

  .anki-mb-1, .my-1 {
    margin-bottom: .25rem!important;
  }
  .anki-rounded {
    border-radius: .25rem!important;
  }

  /*
  .anki-border-success {
    border-color: #dfe1e5!important;
  }
  */

  .anki-card {
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
  .anki-card-header:first-child {
    border-radius: calc(.25rem - 1px) calc(.25rem - 1px) 0 0;
  }
  .anki-font-weight-bold {
    font-weight: 700!important;
  }

  .bg-title {
  background-color: #c6e1e4!important;
  }

  .anki-card-header {
    padding: .75rem 1.25rem;
    margin-bottom: 0;
    background-color: rgba(0,0,0,.03);
    border-bottom: 1px solid rgba(0,0,0,.125);
  }

  /*card body*/
  .text-success {
    color: #28a745!important;
  }
  .anki-card-body {
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    padding: .75rem 1.25rem;
    border-bottom: solid 1px;
  }


  /*card footer*/
  .card-footer:last-child {
    border-radius: 0 0 calc(.25rem - 1px) calc(.25rem - 1px);
  }

  .anki-bg-transparent {
    background-color: transparent!important;
  }

  .anki-card-footer {
    padding: .75rem 1.25rem;
    background-color: rgba(0,0,0,.03);
    border-top: 1px solid rgba(0,0,0,.125);
  }

  </style>
`

    // 图片等资源的路径, 注意windows要将 反斜杠\ 换成 斜杠/
    // 需开启 web服务器
    // const media_path = `C:/Users/y/AppData/Roaming/Anki2/用户1/collection.media/`
    // const media_url = 'file:///' + media_path

    let WHERE = ''

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
            // ['duckduckgo', ['#search_form_input', '.results--sidebar']],
        ])

        for (let [key, value] of HOST_MAP) {
            if (host.includes(key)) {
                WHERE = key
                searchInput = $(value[0], window.top.document)
                targetDom = $(value[1], window.top.document)
                break
            }
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

        let data = commonData('retrieveMediaFile', { 'filename': filename })
        data = JSON.stringify(data)
        const _searchByFileName = new Promise((resolve, reject) => {
            $.post(local_url, data)
                .done((res) => {
                    resolve([filename, res.result])
                })
                .fail((err) => {
                    reject(err)
                })
        })
        srcCount = getSrcCount.next().value
        return _searchByFileName
    }

    const searchByTest = (searchText) => {

        /**
         * 搜索文字返回含卡片ID的数组
         * searchText: str 要搜索的内容
         * from:    str 搜索特定的牌组
         * callback:   array noteIds
         */
        let from = '-deck:English'
        if (SEARCH_FROM) {
            from = SEARCH_FROM
        }
        let query = `${from} ${searchText}`
        let data = commonData('findNotes', { 'query': query })
        data = JSON.stringify(data)
        const _searchByTest = new Promise((resolve, reject) => {
            $.post(local_url, data)
                .done((res) => {
                    // 只要前37个结果
                    res.result.length >= 37
                        ? res.result.length = 37
                        : null
                    resolve(res.result)
                })
                .fail((err) => {
                    reject(err)
                })
        })
        idCount = getIdCount.next().value
        return _searchByTest
    }



    const searchByIds = (ids) => {
        /**
         * 通过卡片Id获取卡片列表
         * callback: cards array
         */
        let notes = ids
        let data = commonData('notesInfo', { 'notes': notes })
        data = JSON.stringify(data)

        const _searchByIds = new Promise((resolve, reject) => {
            $.post(local_url, data)
                .done((res) => {
                    resolve(res.result)
                })
                .fail((err) => {
                    reject(err)
                })
        })
        detailCount = getDetailCount.next().value
        return _searchByIds
    }


    const search = (searchValue, callback) => {
        /**
         * 结合两次请求, 一次完整的搜索
         * searchByTest() --> searchByIds()
         * searchValue: 搜索框的内容
         * callback: cards: array
         */

        if (!searchValue.length) {
            return
        }

        searchByTest(searchValue).then((ids) => {
            searchByIds(ids).then((cards) => {
                callback(cards)
                console.log(
                    '总请求次数:', idCount + detailCount + srcCount, '\n',
                    'src请求次数：', srcCount + '\n',
                    'detail请求次数', detailCount + '\n',
                    'id请求次数', idCount + '\n' ,
                )
            })
        })
        
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

    let lastCount = next_id()
    let getIdCount = next_id()
    let getDetailCount = next_id()
    let getSrcCount = next_id()
    let idCount = 0
    let detailCount = 0
    let srcCount = 0


    let templateItem = (id, title, frontCard, backCard, show = 'show') => {
        let template = `
    <div class="anki-card anki-border-success anki-mb-1 anki-rounded" style="min-width: 35rem; max-width: 50rem; width:fit-content; width:-webkit-fit-content; width:-moz-fit-content;">
      <div class="anki-card-header bg-title anki-font-weight-bold
      collapsed" id="heading${id}" data-toggle="collapse" aria-expanded="false" data-target="#collapse${id}" aria-controls="collapse${id}">
      ${title}
      </div>

      <div class="collapse ${show}"  id="collapse${id}" aria-labelledby="heading${id}" data-parent="#accordionCard">
        <div class="anki-card-body text-success anki-border-success" >${frontCard}</div>
        <div class="anki-card-footer anki-bg-transparent anki-border-success">${backCard}</div>
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
        let father = $('#accordionCard', window.top.document)
        if (Object.keys(father).length <= 2) {
            // 根据不同网站加入容器
            targetDom[0].prepend(containerDiv[0])
        }
    }

    const insertCards = (domsArray) => {
        /**
         * 将节点插入到页面中
         * domsArray: array dom节点列表
         * targetDom： 要在页面中依附的元素
         */



        // 多次搜索清空旧结果
        let father = $('#accordionCard', window.top.document)
        father.empty()

        // 添加搜索结果到容器内
        let str, imageDom
        let fit = 'width:fit-content; width:-webkit-fit-content; width:-moz-fit-content;'
        domsArray.forEach((item, index) => {
            father.append(item)

            // 卡片样式在各站点的适配
            switch (WHERE) {
                // case 'google': $(item).attr('style', 'min-width: 40rem; max-width: 45rem;' + fit)
                // break
                case 'bing': $(item).attr('style', 'min-width: 28rem; max-width: 45rem;' + fit)
                    break
                case 'baidu': // 如果想适配百度，需把css的rem 换算，百度的rem 有毒
                    $(item).attr('style', 'min-width: 400px; max-width: 600px;' + fit)
                    $(item).find('.anki-card-footer').attr('style', 'padding: 9.75px 16.25px;')
                    $(item).find('.anki-card-body').attr('style', 'padding: 9.75px 16.25px;')
                    $(item).find('.anki-card-header').attr('style', 'padding: 9.75px 16.25px;')
                    break
                // default: $(item).attr('style', 'min-width: 35rem; max-width: 45rem;' + fit)
                // break
            }


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
                imageDom = $(`img[src="${filename}"]`, window.top.document)
                // dom 更替src属性
                imageDom.attr('src', data)
                //样式 限制图片宽度
                imageDom.attr('style', ' max-width: 520px;')
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
        if (frontCard.includes('</div>')) {
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



    // const replaceDivSrc = (str, s_b_map) => {
    //   /**
    //    * 更替div中的src属性
    //    */
    //   let tempStr = str
    //   for (let i of s_b_map) {
    //     tempStr = tempStr.replace(i[0], i[i])
    //   }
    //   return tempStr
    // }


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
        let id, title, frontCard, backCard, show, isFirst, itemDivs, fileds_f, fileds_b
        FRONT_CARCD_FILES ? fileds_f = FRONT_CARCD_FILES : fileds_f = '正面'
        BACK_CARK_FILES ? fileds_b = BACK_CARK_FILES : fileds_b = '背面'

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
            frontCard = item.fields[fileds_f]['value']
            backCard = item.fields[fileds_b]['value']
                ; ([frontCard, title] = getTittleFromFrontCard(index + 1, frontCard))

            let strDiv = templateItem(id, title, frontCard, backCard, show)
            let itemDiv = $.parseHTML(strDiv)
            itemDivs.push(itemDiv)
        })
        // 处理收集的itemDivs，插入到页面中
        insertCards(itemDivs)
    }


    const seacrhAddEventListener = (searchInput) => {
        /**
         * 搜索框有内容变化触发更新
         */
        let lastSearchText = '' // 最新一次请求的搜索的参数
        let lastTime            // 最后触发事件的时间 
        searchInput.on({

            // 有输入行为
            input: function (e) {
                // 相同的内容就不请求了
                if (lastSearchText !== searchInput.val()) {
                     // 0.7秒内没有新的事件触发，才发一次结合请求
                    lastTime = e.timeStamp
                    setTimeout(() => {
                        if (lastTime - e.timeStamp == 0) {
                            lastSearchText = searchInput.val()
                            search(lastSearchText, (cards) => {
                                console.log('inputEven request tiems', lastCount.next().value, searchInput.val(), cards)
                                resolveCars(cards)
                            })
                        }
                    }, 700)
                }

            },

            // 失焦触发请求
            change: function () {
                console.log('change request', searchInput.val())
                if (lastSearchText !== searchInput.val()) {
                    search(searchInput.val(), (cards) => {
                        resolveCars(cards)
                    })
                }
            },

        })
    }


    let lastClick  // 记录最后一次显示或隐藏的卡片
    const switchCardAddEventListener = () => {
        /**
         * 控制卡片风手琴
         */
        $('#accordionCard', window.top.document).on('click', '.collapsed', function (event) {

            let cardTitle = $(event.target)
            let targetId = cardTitle.data('target')
            let collapse = $(targetId, window.top.document)

            //目标元素的显示与隐藏
            collapse.toggle(500)
            collapse.toggleClass('show')

            // 上一个元素的隐藏，如果是自身则不操作
            if (lastClick && lastClick.attr('id') !== collapse.attr('id')) {
                // 如果有 show的class 则去掉并隐藏
                lastClick.hide(500)
                lastClick.removeClass('show')
            }

            // 如果目标卡片是打开状态，标志
            if (collapse.hasClass('show')) {
                lastClick = collapse
            }

        })
    }


    $(window.top.document).ready(() => {
        // 注入脚本
        let html = $.parseHTML(requiredScript, window.top.document, true)
        $('body', window.top.document).append(html)
    })


    $(document).ready(() => {

        // 获取输入框 与 搜索值
        let [searchInput, targetDom] = getHostSearchInputAndTarget()

        // 终止搜索
        if (!searchInput[0]) {
            console.log('在页面没有找到搜索框', searchInput)
            return
        }
        if (!targetDom[0]) {
            console.log('在页面没有找到可依附的元素', targetDom)
            return
        }


        // 插入容器到页面
        insertContainet(targetDom)


        // 刷新，搜索一次
        search(searchInput.val(), (cards) => {
            resolveCars(cards)
        })


        // 输入框的搜索事件监听
        seacrhAddEventListener(searchInput)

        // 控制卡片风手琴的事件监听
        switchCardAddEventListener()

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
        if (!condition) {
            console.log(e)
        }
    }

    //-----------------------------------------------------------------------

})();