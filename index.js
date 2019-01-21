//将footer和main分离，作为一个中介使得两部分进行交互
var EventCenter = {
  on: function (type, handler) {
    $(document).on(type, handler)
  },
  fire: function (type, data) {
    $(document).trigger(type, data)
  }
}
// 底部导航栏
var Footer = {
  init: function () {
    this.$footer = $('footer')
    this.$box = this.$footer.find('.box')
    this.$ul = this.$footer.find('ul')
    this.$RBtn = this.$footer.find('.icon-right')
    this.$LBtn = this.$footer.find('.icon-left')
    this.isToEnd = false
    this.isToStart = true
    this.isAnimating = false
    this.bind()
    this.render()
  },
  bind: function () {
    var _this = this

    this.$RBtn.on('click', function () {
      var liWidth = _this.$footer.find('li').outerWidth(true)
      var boxWidth = _this.$box.width()
      var colNum = Math.floor(boxWidth / liWidth)
      if (_this.isAnimating) return
      if (!_this.isToEnd) {
        _this.isAnimating = true
        _this.$ul.animate({
          left: '-=' + colNum * liWidth
        }, 300, function () {
          _this.isAnimating = false
          _this.isToStart = false
          if (parseFloat(boxWidth) - parseFloat(_this.$ul.css('left')) > parseFloat(_this.$ul.css('width'))) {
            _this.isToEnd = true
          }
        })
      }
    })

    this.$LBtn.on('click', function () {
      var liWidth = _this.$footer.find('li').outerWidth(true)
      var boxWidth = _this.$box.width()
      var colNum = Math.floor(boxWidth / liWidth)
      if (_this.isAnimating) return
      if (!_this.isToStart) {
        _this.isAnimating = true
        _this.$ul.animate({
          left: '+=' + colNum * liWidth
        }, 300, function () {
          _this.isAnimating = false
          _this.isToEnd = false
          if (parseFloat(_this.$ul.css('left')) >= 0) {
            _this.isToStart = true
          }
        })
      }
    })

    this.$footer.on('click', 'li', function () {
      $(this).addClass('active').siblings().removeClass('active')

      //事件中心，绑定下面这个操作，只要触发了‘select-album’
      EventCenter.fire('select-album', {
        channelId: $(this).attr('data-channel-id'),
        channelName: $(this).attr('data-channel-name')
      })
    })
  },
  render: function () {
    var _this = this

    $.getJSON('//jirenguapi.applinzi.com/fm/getChannels.php').done(function (ret) {
      console.log(ret)
      _this.renderFooter(ret.channels)
    }).fail(function () {
      console.log('error')
    })
  },
  renderFooter: function (channels) {
    // var _this = this
    console.log(channels)
    var html = ''
    channels.forEach(function (channel) {
      html += '<li data-channel-id="' + channel.channel_id + '" data-channel-name="' + channel.name + '">'
        + '<div class="cover" style="background-image:url(' + channel.cover_small + ')"></div>'
        + '<h3>' + channel.name + '</h3>'
        + '</li>'

    })
    this.$ul.html(html)
    this.setStyle()
  },
  setStyle: function () {
    var liNum = this.$footer.find('li').length
    var liWidth = this.$footer.find('li').outerWidth(true)
    this.$ul.css({
      width: liNum * liWidth + 'px'
    })
  }
}

// 播放器主体部分
var Fm = {
  init: function () {
    this.$container = $('#page-music')
    this.audio = new Audio()
    this.audio.autoplay = true
    this.bind()
  },
  bind: function () {
    var _this = this
    EventCenter.on('select-album', function (e, channelObj) {
      _this.channelId = channelObj.channelId
      _this.channelName = channelObj.channelName
      _this.loadMusic()
    })

    this.$container.find('.btn-play').on('click', function () {
      $btn = $(this)
      // 点击暂停
      if ($btn.hasClass('icon-pause')) {
        $btn.removeClass('icon-pause').addClass('icon-play')
        _this.audio.pause()
      }
      else {
        // 点击播放
        $btn.removeClass('icon-play').addClass('icon-pause')
        _this.audio.play()
      }
    })
    // 收藏和取消收藏
    this.$container.find('.icon-heart').on('click', function () {
      $btn = $(this)
      if ($btn.hasClass('active')) {
        $btn.removeClass('active')
      } else {
        $btn.addClass('active')
      }
    })
    // 切歌
    this.$container.find('.btn-next').on('click', function () {
      _this.loadMusic()
    })

    this.audio.addEventListener('play', function () {
      clearInterval(_this.statusClock)
      _this.statusClock = setInterval(function () {
        _this.upStatus()
      }, 1000)
    })
    this.audio.addEventListener('pause', function () {
      clearInterval(_this.statusClock)
    })
  },

  loadMusic() {
    var _this = this
    console.log('loadMusic...')
    $.getJSON('//jirenguapi.applinzi.com/fm/getSong.php', { channel: this.channelId }).done(function (ret) {
      console.log(ret)
      _this.song = ret['song'][0]
      _this.setMusic()
      _this.loadLysic()
    })
  },
  loadLysic() {
    var _this = this
    console.log('loadLysic...')
    $.getJSON('//jirenguapi.applinzi.com/fm/getLyric.php', { sid: this.song.sid }).done(function (ret) {
      console.log(ret)

      var lyric = ret.lyric
      var lyricObj = {}
      console.log(lyric)
      lyric.split('\n').forEach(function (line) {
        var times = line.match(/\d{2}:\d{2}/g)
        var str = line.replace(/\[.+?\]/g, '')
        if (Array.isArray(times)) {
          times.forEach(function (time) {
            lyricObj[time] = str
          })
        }
        _this.lyricObj = lyricObj
      })

    })
  },
  setMusic() {
    var _this = this
    this.audio.src = this.song.url
    this.$container.find('.btn-play').removeClass('icon-play').addClass('icon-pause')
    $('.bg').css('background-image', 'url(' + _this.song.picture + ')')
    this.$container.find('figure').css('background-image', 'url(' + _this.song.picture + ')')
    this.$container.find('.detail h1').text(_this.song.title)
    this.$container.find('.author').text(_this.song.artist)
    this.$container.find('.tag').text(_this.channelName)
  },
  upStatus() {
    var min = Math.floor(this.audio.currentTime / 60)
    var second = Math.floor(this.audio.currentTime % 60) + ''
    second = second < 10 ? '0' + second : second
    this.$container.find('.time').text(min + ':' + second)


    this.$container.find('.bar-progress').css('width', (this.audio.currentTime / this.audio.duration) * 100 + '%')

    // 对应时间的歌词
    var line = this.lyricObj['0' + min + ':' + second]
    if (line && this.lyricObj) {
      this.$container.find('.lyric p').text(line)
    }
  }
}


Footer.init()
Fm.init()