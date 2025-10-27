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