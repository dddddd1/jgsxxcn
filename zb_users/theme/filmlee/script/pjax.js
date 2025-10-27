(function($){
function fnPjax(selector, container, options) {
  var context = this
  return this.on('click.pjax', selector, function(event) {
    var opts = $.extend({}, optionsFor(container, options))
    if (!opts.container)
      opts.container = $(this).attr('data-pjax') || context
    handleClick(event, opts)
  })
}
function handleClick(event, container, options) {
  options = optionsFor(container, options)
  var link = event.currentTarget
  if (link.tagName.toUpperCase() !== 'A')
    throw "$.fn.pjax or $.pjax.click requires an anchor element"
  if ( event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey )
    return
  if ( location.protocol !== link.protocol || location.hostname !== link.hostname )
    return
  if (link.hash && link.href.replace(link.hash, '') ===
       location.href.replace(location.hash, ''))
    return
  if (link.href === location.href + '#')
    return
  var defaults = {
    url: link.href,
    container: $(link).attr('data-pjax'),
    target: link
  }
  var opts = $.extend({}, defaults, options)
  var clickEvent = $.Event('pjax:click')
  $(link).trigger(clickEvent, [opts])
  if (!clickEvent.isDefaultPrevented()) {
    pjax(opts)
    event.preventDefault()
    $(link).trigger('pjax:clicked', [opts])
  }
}
function handleSubmit(event, container, options) {
  options = optionsFor(container, options)
  var form = event.currentTarget
  if (form.tagName.toUpperCase() !== 'FORM')
    throw "$.pjax.submit requires a form element"
  var defaults = {
    type: form.method.toUpperCase(),
    url: form.action,
    data: $(form).serializeArray(),
    container: $(form).attr('data-pjax'),
    target: form
  }
  pjax($.extend({}, defaults, options))
  event.preventDefault()
}
function pjax(options) {
  options = $.extend(true, {}, $.ajaxSettings, pjax.defaults, options)
  if ($.isFunction(options.url)) {
    options.url = options.url()
  }
  var target = options.target
  var hash = parseURL(options.url).hash
  var context = options.context = findContainerFor(options.container)
  if (!options.data) options.data = {}
  options.data._pjax = context.selector
  function fire(type, args) {
    var event = $.Event(type, { relatedTarget: target })
    context.trigger(event, args)
    return !event.isDefaultPrevented()
  }
  var timeoutTimer
  options.beforeSend = function(xhr, settings) {
    if (settings.type !== 'GET') {
      settings.timeout = 0
    }
    xhr.setRequestHeader('X-PJAX', 'true')
    xhr.setRequestHeader('X-PJAX-Container', context.selector)
    if (!fire('pjax:beforeSend', [xhr, settings]))
      return false
    if (settings.timeout > 0) {
      timeoutTimer = setTimeout(function() {
        if (fire('pjax:timeout', [xhr, options]))
          xhr.abort('timeout')
      }, settings.timeout)
      settings.timeout = 0
    }
    options.requestUrl = parseURL(settings.url).href
  }
  options.complete = function(xhr, textStatus) {
    if (timeoutTimer)
      clearTimeout(timeoutTimer)
    fire('pjax:complete', [xhr, textStatus, options])
    fire('pjax:end', [xhr, options])
  }
  options.error = function(xhr, textStatus, errorThrown) {
    var container = extractContainer("", xhr, options)
    var allowed = fire('pjax:error', [xhr, textStatus, errorThrown, options])
    if (options.type == 'GET' && textStatus !== 'abort' && allowed) {
      locationReplace(container.url)
    }
  }
  options.success = function(data, status, xhr) {
    var currentVersion = (typeof $.pjax.defaults.version === 'function') ?
      $.pjax.defaults.version() :
      $.pjax.defaults.version
    var latestVersion = xhr.getResponseHeader('X-PJAX-Version')
    var container = extractContainer(data, xhr, options)
    if (currentVersion && latestVersion && currentVersion !== latestVersion) {
      locationReplace(container.url)
      return
    }
    if (!container.contents) {
      locationReplace(container.url)
      return
    }
    pjax.state = {
      id: options.id || uniqueId(),
      url: container.url,
      title: container.title,
      container: context.selector,
      fragment: options.fragment,
      timeout: options.timeout
    }
    if (options.push || options.replace) {
      window.history.replaceState(pjax.state, container.title, container.url)
    }
    document.activeElement.blur()
    if (container.title) document.title = container.title
    context.html(container.contents)
    var autofocusEl = context.find('input[autofocus], textarea[autofocus]').last()[0]
    if (autofocusEl && document.activeElement !== autofocusEl) {
      autofocusEl.focus();
    }
    executeScriptTags(container.scripts)
    if (typeof options.scrollTo === 'number')
      $(window).scrollTop(options.scrollTo)
    if ( hash !== '' ) {
      var url = parseURL(container.url)
      url.hash = hash
      pjax.state.url = url.href
      window.history.replaceState(pjax.state, container.title, url.href)
      var target = $(url.hash)
      if (target.length) $(window).scrollTop(target.offset().top)
    }
    fire('pjax:success', [data, status, xhr, options])
  }
  if (!pjax.state) {
    pjax.state = {
      id: uniqueId(),
      url: window.location.href,
      title: document.title,
      container: context.selector,
      fragment: options.fragment,
      timeout: options.timeout
    }
    window.history.replaceState(pjax.state, document.title)
  }
  var xhr = pjax.xhr
  if ( xhr && xhr.readyState < 4) {
    xhr.onreadystatechange = $.noop
    xhr.abort()
  }
  pjax.options = options
  var xhr = pjax.xhr = $.ajax(options)
  if (xhr.readyState > 0) {
    if (options.push && !options.replace) {
      cachePush(pjax.state.id, context.clone().contents())
      window.history.pushState(null, "", stripPjaxParam(options.requestUrl))
    }
    fire('pjax:start', [xhr, options])
    fire('pjax:send', [xhr, options])
  }
  return pjax.xhr
}
function pjaxReload(container, options) {
  var defaults = {
    url: window.location.href,
    push: false,
    replace: true,
    scrollTo: false
  }
  return pjax($.extend(defaults, optionsFor(container, options)))
}
function locationReplace(url) {
  window.history.replaceState(null, "", "#")
  window.location.replace(url)
}
var initialPop = true
var initialURL = window.location.href
var initialState = window.history.state
if (initialState && initialState.container) {
  pjax.state = initialState
}
if ('state' in window.history) {
  initialPop = false
}
function onPjaxPopstate(event) {
  var state = event.state
  if (state && state.container) {
    if (initialPop && initialURL == state.url) return
    if (pjax.state.id === state.id) return
    var container = $(state.container)
    if (container.length) {
      var direction, contents = cacheMapping[state.id]
      if (pjax.state) {
        direction = pjax.state.id < state.id ? 'forward' : 'back'
        cachePop(direction, pjax.state.id, container.clone().contents())
      }
      var popstateEvent = $.Event('pjax:popstate', {
        state: state,
        direction: direction
      })
      container.trigger(popstateEvent)
      var options = {
        id: state.id,
        url: state.url,
        container: container,
        push: false,
        fragment: state.fragment,
        timeout: state.timeout,
        scrollTo: false
      }
      if (contents) {
        container.trigger('pjax:start', [null, options])
        if (state.title) document.title = state.title
        container.html(contents)
        pjax.state = state
        container.trigger('pjax:end', [null, options])
      } else {
        pjax(options)
      }
      container[0].offsetHeight
    } else {
      locationReplace(location.href)
    }
  }
  initialPop = false
}
function fallbackPjax(options) {
  var url = $.isFunction(options.url) ? options.url() : options.url,
      method = options.type ? options.type.toUpperCase() : 'GET'
  var form = $('<form>', {
    method: method === 'GET' ? 'GET' : 'POST',
    action: url,
    style: 'display:none'
  })
  if (method !== 'GET' && method !== 'POST') {
    form.append($('<input>', {
      type: 'hidden',
      name: '_method',
      value: method.toLowerCase()
    }))
  }
  var data = options.data
  if (typeof data === 'string') {
    $.each(data.split('&'), function(index, value) {
      var pair = value.split('=')
      form.append($('<input>', {type: 'hidden', name: pair[0], value: pair[1]}))
    })
  } else if (typeof data === 'object') {
    for (key in data)
      form.append($('<input>', {type: 'hidden', name: key, value: data[key]}))
  }
  $(document.body).append(form)
  form.submit()
}
function uniqueId() {
  return (new Date).getTime()
}
function stripPjaxParam(url) {
  return url
    .replace(/\?_pjax=[^&]+&?/, '?')
    .replace(/_pjax=[^&]+&?/, '')
    .replace(/[\?&]$/, '')
}
function parseURL(url) {
  var a = document.createElement('a')
  a.href = url
  return a
}
function optionsFor(container, options) {
  if ( container && options )
    options.container = container
  else if ( $.isPlainObject(container) )
    options = container
  else
    options = {container: container}
  if (options.container)
    options.container = findContainerFor(options.container)
  return options
}
function findContainerFor(container) {
  container = $(container)
  if ( !container.length ) {
    throw "no pjax container for " + container.selector
  } else if ( container.selector !== '' && container.context === document ) {
    return container
  } else if ( container.attr('id') ) {
    return $('#' + container.attr('id'))
  } else {
    throw "cant get selector for pjax container!"
  }
}
function findAll(elems, selector) {
  return elems.filter(selector).add(elems.find(selector));
}
function parseHTML(html) {
  return $.parseHTML(html, document, true)
}
function extractContainer(data, xhr, options) {
  var obj = {}
  obj.url = stripPjaxParam(xhr.getResponseHeader('X-PJAX-URL') || options.requestUrl)
  if (/<html/i.test(data)) {
    var $head = $(parseHTML(data.match(/<head[^>]*>([\s\S.]*)<\/head>/i)[0]))
    var $body = $(parseHTML(data.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[0]))
  } else {
    var $head = $body = $(parseHTML(data))
  }
  if ($body.length === 0)
    return obj
  obj.title = findAll($head, 'title').last().text()
  if (options.fragment) {
    if (options.fragment === 'body') {
      var $fragment = $body
    } else {
      var $fragment = findAll($body, options.fragment).first()
    }
    if ($fragment.length) {
      obj.contents = $fragment.contents()
      if (!obj.title)
        obj.title = $fragment.attr('title') || $fragment.data('title')
    }
  } else if (!/<html/i.test(data)) {
    obj.contents = $body
  }
  if (obj.contents) {
    obj.contents = obj.contents.not(function() { return $(this).is('title') })
    obj.contents.find('title').remove()
    obj.scripts = findAll(obj.contents, 'script[src]').remove()
    obj.contents = obj.contents.not(obj.scripts)
  }
  if (obj.title) obj.title = $.trim(obj.title)
  return obj
}
function executeScriptTags(scripts) {
  if (!scripts) return
  var existingScripts = $('script[src]')
  scripts.each(function() {
    var src = this.src
    var matchedScripts = existingScripts.filter(function() {
      return this.src === src
    })
    if (matchedScripts.length) return
    var script = document.createElement('script')
    script.type = $(this).attr('type')
    script.src = $(this).attr('src')
    document.head.appendChild(script)
  })
}
var cacheMapping      = {}
var cacheForwardStack = []
var cacheBackStack    = []
function cachePush(id, value) {
  cacheMapping[id] = value
  cacheBackStack.push(id)
  while (cacheForwardStack.length)
    delete cacheMapping[cacheForwardStack.shift()]
  while (cacheBackStack.length > pjax.defaults.maxCacheLength)
    delete cacheMapping[cacheBackStack.shift()]
}
function cachePop(direction, id, value) {
  var pushStack, popStack
  cacheMapping[id] = value
  if (direction === 'forward') {
    pushStack = cacheBackStack
    popStack  = cacheForwardStack
  } else {
    pushStack = cacheForwardStack
    popStack  = cacheBackStack
  }
  pushStack.push(id)
  if (id = popStack.pop())
    delete cacheMapping[id]
}
function findVersion() {
  return $('meta').filter(function() {
    var name = $(this).attr('http-equiv')
    return name && name.toUpperCase() === 'X-PJAX-VERSION'
  }).attr('content')
}
function enable() {
  $.fn.pjax = fnPjax
  $.pjax = pjax
  $.pjax.enable = $.noop
  $.pjax.disable = disable
  $.pjax.click = handleClick
  $.pjax.submit = handleSubmit
  $.pjax.reload = pjaxReload
  $.pjax.defaults = {
    timeout: 8000,
    push: true,
    replace: false,
    type: 'GET',
    dataType: 'html',
    scrollTo: 0,
    maxCacheLength: 200,
    version: findVersion
  }
  $(window).on('popstate.pjax', onPjaxPopstate)
}
function disable() {
  $.fn.pjax = function() { return this }
  $.pjax = fallbackPjax
  $.pjax.enable = enable
  $.pjax.disable = $.noop
  $.pjax.click = $.noop
  $.pjax.submit = $.noop
  $.pjax.reload = function() { window.location.reload() }
  $(window).off('popstate.pjax', onPjaxPopstate)
}
if ( $.inArray('state', $.event.props) < 0 )
  $.event.props.push('state')
$.support.pjax =
  window.history && window.history.pushState && window.history.replaceState &&
  !navigator.userAgent.match(/((iPod|iPhone|iPad).+\bOS\s+[1-4]|WebApps\/.+CFNetwork)/)
$.support.pjax ? enable() : disable()
})(jQuery);
$(function() {
    $(document).pjax('a[target!=_blank]:not(.cp-vrs a,.cp-login a,.cp-login1 a,.cp-hello em)', '#header_content', {fragment:'#header_content', timeout:2000});
	$(document).on("submit", ".s-form", "btnPost", "#footer",
	function(a) {
		$.pjax.submit(a, "#header_content", {
			fragment: "#header_content",
			timeout: 6000
		})
	});
	/*加载样式取消
	$(document).on('pjax:send', function() {
		$(".pjax_loading,#zbp_ajax_loading").css("display", "block");
		//$('<div title="拼命加载页面中..." id="zbp_ajax_loading"><div></div></div>').appendTo("body");
		//$('#art_main').fadeTo(500,0.0);
	});
	$(document).on('pjax:complete', function() {
		clublee_pjaxafter();
		$(".pjax_loading,#zbp_ajax_loading").css("display", "none");
	});*/
	//开始
	$(document).on('pjax:send', function() {
	$('<div id="zbp_ajax_loading_frame"></div><div title="拼命加载页面中..." id="zbp_ajax_loading"><div></div></div>').appendTo("body");
		$('#art_main').fadeTo(500,0.0);
		});
	$(document).on('pjax:complete', function() {
		$("#zbp_ajax_loading_frame,#zbp_ajax_loading").remove();
		clublee_pjaxafter();
		$('#art_main').fadeTo(500,1);
		});
	//结束
});
function clublee_pjaxafter(){

//重写了common.js里的同名函数
function RevertComment(i){$("#inpRevID").val(i);var frm=$('#comment'),cancel=$("#cancel-reply"),temp=$('#temp-frm');var div=document.createElement('div');div.id='temp-frm';div.style.display='none';frm.before(div);$('#AjaxComment'+i).before(frm);frm.addClass("");cancel.show();cancel.click(function(){$("#inpRevID").val(0);var temp=$('#temp-frm'),frm=$('#comment');if(!temp.length||!frm.length)return;temp.before(frm);temp.remove();$(this).hide();frm.removeClass("");return false});try{$('#txaArticle').focus()}catch(e){}return false}
//重写GetComments，防止评论框消失
function GetComments(logid,page){$('span.commentspage').html("Waiting...");$.get(bloghost+"zb_system/cmd.php?act=getcmt&postid="+logid+"&page="+page,function(data){$('#AjaxCommentBegin').nextUntil('#AjaxCommentEnd').remove();$('#AjaxCommentEnd').before(data);$("#cancel-reply").click()})}
function CommentComplete(){$("#cancel-reply").click()}
//导航跟随
(function(){
var nav=$("#nav-header");
var win=$(window);
var sc=$(document);
win.scroll(function(){
  if(sc.scrollTop()>=110){
    nav.addClass("fixednav");
   $(".navTmp").fadeIn();
  }else{
   nav.removeClass("fixednav");
   $(".navTmp").fadeOut();
  }
}) 
})();
//导航高亮
jQuery(document).ready(function($){ 
    var datatype=$("#nav-header").attr("data-type");
	$(".nav>li ").each(function(){
		try{
			var myid=$(this).attr("id");
			if("index"==datatype){
				if(myid=="nvabar-item-index"){
					$("#nvabar-item-index a:first-child").addClass("current-menu-item");
				}
			}else if("category"==datatype){
				var infoid=$("#nav-header").attr("data-infoid");
				if(infoid!=null){
					var b=infoid.split(' ');
					for(var i=0;i<b.length;i++){
						if(myid=="navbar-category-"+b[i]){
							$("#navbar-category-"+b[i]+" a:first-child").addClass("current-menu-item");
						}
					}
				}
			}else if("article"==datatype){
				var infoid=$("#nav-header").attr("data-infoid");
				if(infoid!=null){
					var b=infoid.split(' ');
					for(var i=0;i<b.length;i++){
						if(myid=="navbar-category-"+b[i]){
							$("#navbar-category-"+b[i]+" a:first-child").addClass("current-menu-item");
						}
					}
				}
			}else if("page"==datatype){
				var infoid=$("#nav-header").attr("data-infoid");
				if(infoid!=null){
					if(myid=="navbar-page-"+infoid){
						$("#navbar-page-"+infoid+" a:first-child").addClass("current-menu-item");
					}
				}
			}else if("tag"==datatype){
				var infoid=$("#nav-header").attr("data-infoid");
				if(infoid!=null){
					if(myid=="navbar-tag-"+infoid){
						$("#navbar-tag-"+infoid+" a:first-child").addClass("current-menu-item");
					}
				}
			}
		}catch(E){}
	});
	
	$("#nav-header").delegate("a","click",function(){
		$(".nav>li a").each(function(){
			$(this).removeClass("current-menu-item");
		});
		if($(this).closest("ul")!=null && $(this).closest("ul").length!=0){
			if($(this).closest("ul").attr("id")=="menu-navigation"){
				$(this).addClass("current-menu-item");
			}else{
				$(this).closest("ul").closest("li").find("a:first-child").addClass("current-menu-item");
			}
		}
	});
});
//公告轮播
!function(a) {
    var b, c = $("#callboard"),
    d = c.find("ul"),
    e = c.find("li"),
    f = c.find("li").length,
    g = e.first().outerHeight(!0);
    a.autoAnimation = function() {
        var a, e;
        1 >= f || (a = arguments.callee, e = c.find("li").first(), e.animate({
            marginTop: -g
        },
        500,
        function() {
            clearTimeout(b),
            e.appendTo(d).css({
                marginTop: 2
            }),
            b = setTimeout(a, 3e3)
        }))
    },
    c.mouseenter(function() {
        clearTimeout(b)
    }).mouseleave(function() {
        b = setTimeout(a.autoAnimation, 3e3)
    })
} (window),
setTimeout(window.autoAnimation, 3e3);
//标签
(function() { 
	var sc=$(document);
	var tags_a = $("#divTags li"); 
	tags_a.each(function(){ 
		var x = 5; 
		var y = 0; 
	var rand = parseInt(Math.random() * (x - y + 1) + y); 
$(this).addClass("divTags"+rand); 
}); 
})();
//快捷键
$(document).keypress(function(e){
      var s = $('.button');
      if( e.ctrlKey && e.which == 13 || e.which == 10 ){ 
        s.click();
        document.body.focus();
        return;
      }
      if( e.shiftKey && e.which==13 || e.which == 10 ) s.click();
});
//手机导航
$(".screen-mini").click(function() {
    $(".nav").toggleClass('active')
});
//top
(function(){
        var $backToTopTxt = " ",
            $backToTopEle = $('<a class="totop"></a>').appendTo($("body")).text($backToTopTxt).attr("title", "\u8fd4\u56de\u9876\u90e8").click(function() {
                $("html, body").animate({
                    scrollTop: 0
                }, 0)
            }),
            $backToTopFun = function() {
                var st = $(document).scrollTop(),
                    winh = $(window).height();
                (st > 500) ? $backToTopEle.show(): $backToTopEle.hide();
                if (!window.XMLHttpRequest) {
                    $backToTopEle.css("top", st + winh - 100)
                }
            };
        $(window).bind("scroll", $backToTopFun);
        $(function() {
            $backToTopFun()
        })
})();

//加载
eval(function(p,a,c,k,e,d){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--){d[e(c)]=k[c]||e(c)}k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p}('(5($){$.J.L=5(r){8 1={d:0,A:0,b:"h",v:"N",3:4};6(r){$.D(1,r)}8 m=9;6("h"==1.b){$(1.3).p("h",5(b){8 C=0;m.t(5(){6(!$.k(9,1)&&!$.l(9,1)){$(9).z("o")}j{6(C++>1.A){g B}}});8 w=$.M(m,5(f){g!f.e});m=$(w)})}g 9.t(5(){8 2=9;$(2).c("s",$(2).c("i"));6("h"!=1.b||$.k(2,1)||$.l(2,1)){6(1.u){$(2).c("i",1.u)}j{$(2).K("i")}2.e=B}j{2.e=x}$(2).T("o",5(){6(!9.e){$("<V />").p("X",5(){$(2).Y().c("i",$(2).c("s"))[1.v](1.Z);2.e=x}).c("i",$(2).c("s"))}});6("h"!=1.b){$(2).p(1.b,5(b){6(!2.e){$(2).z("o")}})}})};$.k=5(f,1){6(1.3===E||1.3===4){8 7=$(4).F()+$(4).O()}j{8 7=$(1.3).n().G+$(1.3).F()}g 7<=$(f).n().G-1.d};$.l=5(f,1){6(1.3===E||1.3===4){8 7=$(4).I()+$(4).U()}j{8 7=$(1.3).n().q+$(1.3).I()}g 7<=$(f).n().q-1.d};$.D($.P[\':\'],{"Q-H-7":"$.k(a, {d : 0, 3: 4})","R-H-7":"!$.k(a, {d : 0, 3: 4})","S-y-7":"$.l(a, {d : 0, 3: 4})","q-y-7":"!$.l(a, {d : 0, 3: 4})"})})(W);',62,62,'|settings|self|container|window|function|if|fold|var|this||event|attr|threshold|loaded|element|return|scroll|src|else|belowthefold|rightoffold|elements|offset|appear|bind|left|options|original|each|placeholder|effect|temp|true|of|trigger|failurelimit|false|counter|extend|undefined|height|top|the|width|fn|removeAttr|lazyload|grep|show|scrollTop|expr|below|above|right|one|scrollLeft|img|jQuery|load|hide|effectspeed'.split('|'),0,{}))
//登录
$(function () {var $cpLogin = $(".cp-login").find("a");var $cpVrs = $(".cp-vrs").find("a");SetCookie("timezone", (new Date().getTimezoneOffset()/60)*(-1));var $addoninfo = GetCookie("addinfo");if(!$addoninfo){LoadRememberInfo();return ;}$addoninfo = eval("("+$addoninfo+")");if($addoninfo.chkadmin){$(".cp-hello").html("欢迎 " + $addoninfo.useralias + " (" + $addoninfo.levelname  + ")");if ($cpLogin.length == 1 && $cpLogin.html().indexOf("[") > -1) { $cpLogin.html("[后台管理]");} else {$cpLogin.html("后台管理");};}if($addoninfo.chkarticle){if ($cpLogin.length == 1 && $cpVrs.html().indexOf("[") > -1) {$cpVrs.html("[新建文章]"); } else {$cpVrs.html("新建文章");};$cpVrs.attr("href", bloghost + "zb_system/cmd.php?act=ArticleEdt");}});
//banner
jQuery(".banner").slide({ titCell:".hd ul", mainCell:".bd div", effect:"fold",  autoPlay:true, autoPage:true, trigger:"click" });

};