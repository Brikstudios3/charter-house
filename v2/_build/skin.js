/* keep the section nav pinned directly under the header */
(function(){function setH(){var h=document.querySelector('.hdr');if(h)document.documentElement.style.setProperty('--hdrh',Math.round(h.getBoundingClientRect().height)+'px');}
setH();addEventListener('resize',setH);addEventListener('load',setH);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(setH);})();

/* Stockport price chart: draw on scroll, hover/tap for monthly values */
(function(){
  var RMq=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setup(f){
    if(f.dataset.v2)return;f.dataset.v2=1;
    var d=JSON.parse(f.getAttribute('data-hpi')),n=d.length,L=+f.dataset.l,R=+f.dataset.r,W=+f.dataset.w,T=+f.dataset.t,B=+f.dataset.b,H=+f.dataset.h,lo=+f.dataset.lo,hi=+f.dataset.hi;
    var svg=f.querySelector('svg'),hit=f.querySelector('.hhit'),hov=f.querySelector('.hhov'),hl=f.querySelector('.hvl'),hd=f.querySelector('.hvd'),tip=f.querySelector('.htip');
    function X(i){return L+i*(W-L-R)/(n-1)} function Y(v){return T+(hi-v)*(H-T-B)/(hi-lo)}
    function show(ev){var p=ev.touches?ev.touches[0]:ev;var r=svg.getBoundingClientRect();var x=(p.clientX-r.left)*W/r.width;var i=Math.max(0,Math.min(n-1,Math.round((x-L)/(W-L-R)*(n-1))));
      hl.setAttribute('x1',X(i));hl.setAttribute('x2',X(i));hd.setAttribute('cx',X(i));hd.setAttribute('cy',Y(d[i][1]));hov.setAttribute('opacity',1);
      tip.querySelector('b').textContent='£'+d[i][1].toLocaleString('en-GB');tip.querySelector('span').textContent=d[i][0];
      var px=X(i)/W*r.width,py=Y(d[i][1])/H*r.height;tip.style.left=Math.max(60,Math.min(r.width-60,px))+'px';tip.style.top=py+'px';tip.classList.add('on')}
    function hide(){hov.setAttribute('opacity',0);tip.classList.remove('on')}
    hit.addEventListener('mousemove',show);hit.addEventListener('touchstart',show,{passive:true});hit.addEventListener('touchmove',show,{passive:true});hit.addEventListener('mouseleave',hide);
    if(RMq){f.classList.add('in');return}
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){f.classList.add('in');io.disconnect()}})},{threshold:.35});io.observe(f);
  }
  function scan(){document.querySelectorAll('figure.hpi').forEach(setup)}
  scan();new MutationObserver(function(){clearTimeout(scan.t);scan.t=setTimeout(scan,40)}).observe(document.body,{childList:true,subtree:true});
})();

/* Payment timeline: pinned while you scroll through Today, Within 28 days, Early 2028 */
(function(){
  var cur=-1;
  function els(){var run=document.querySelector('.ptlrun');if(!run)return null;return {run:run,ptl:run.querySelector('.ptl'),cards:run.querySelectorAll('.paycard'),stops:run.querySelectorAll('.stop'),fill:run.querySelector('.track .fill')}}
  function stickTop(){var h=document.querySelector('.hdr'),t=document.querySelector('.gtabs');return (h?h.getBoundingClientRect().height:0)+(t?t.getBoundingClientRect().height:0)+14}
  function setStep(i,force){var e=els();if(!e)return;if(i===cur&&!force)return;cur=i;try{S.payStep=i}catch(x){}
    e.cards.forEach(function(c,k){c.classList.toggle('on',k===i);c.setAttribute('aria-hidden',k!==i)});
    e.stops.forEach(function(s,k){s.classList.toggle('on',k===i);s.classList.toggle('past',k<i);s.setAttribute('aria-pressed',k===i);var t=s.querySelector('.tap');if(t)t.textContent=k===i?'Showing':'View'});
    if(e.fill)e.fill.style.setProperty('--p',i/2*100)}
  function fits(e){var avail=innerHeight-stickTop()-((document.querySelector('.ctabar')||{}).offsetHeight||0)-10;return e.ptl.offsetHeight<=avail}
  function hint(pin){var h=document.querySelector('.ptl .thint');if(!h)return;var t=[].slice.call(h.childNodes).filter(function(n){return n.nodeType===3}).pop();if(t)t.textContent=pin?'Scroll to move through each stage, or tap one':'Tap each stage to see what you pay and when'}
  function layout(){var e=els();if(!e)return;e.run.classList.remove('pin');e.run.style.height='';
    if(!fits(e)){hint(false);return}hint(true);e.run.classList.add('pin');e.ptl.style.top=stickTop()+'px';e.run.style.height=(e.ptl.offsetHeight+innerHeight*1.5)+'px';onScroll()}
  function onScroll(){var e=els();if(!e||!e.run.classList.contains('pin'))return;var top=stickTop();var r=e.run.getBoundingClientRect();var total=e.run.offsetHeight-e.ptl.offsetHeight;
    var p=Math.max(0,Math.min(1,(top-r.top)/total));setStep(p<1/3?0:p<2/3?1:2)}
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',function(){clearTimeout(layout.t);layout.t=setTimeout(layout,120)});
  document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('.ptlrun [data-pstep]');if(!b)return;ev.preventDefault();ev.stopPropagation();
    var i=+b.getAttribute('data-pstep');var e=els();
    if(e.run.classList.contains('pin')){var total=e.run.offsetHeight-e.ptl.offsetHeight;var y=e.run.getBoundingClientRect().top+scrollY-stickTop()+total*(i+.5)/3;scrollTo({top:y,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
    setStep(i)},true);
  function init(){var e=els();if(!e||e.run.dataset.v2)return;e.run.dataset.v2=1;cur=-1;var on=0;e.cards.forEach(function(c,k){if(c.classList.contains('on'))on=k});setStep(on,true);layout()}
  new MutationObserver(function(){clearTimeout(init.t);init.t=setTimeout(init,40)}).observe(document.body,{childList:true,subtree:true});
  addEventListener('load',function(){init();layout()});init();
})();

/* pass 9: chapter labels, the seven-step map, the process carousel */
(function(){
  function navOffset(){var h=document.querySelector('.hdr'),t=document.querySelector('.gtabs');return (h?h.getBoundingClientRect().height:0)+(t?t.getBoundingClientRect().height:0)+12}
  function chapters(){var hs=[].slice.call(document.querySelectorAll('#view .gsec .chh'));var n=hs.length;
    hs.forEach(function(h,i){if(h.querySelector('.chof'))return;var d=h.querySelector('h2');if(!d)return;var s=document.createElement('span');s.className='chof';s.textContent='Chapter '+(i+1)+' of '+n;d.parentNode.insertBefore(s,d)})}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-case]');if(!b)return;var t=document.getElementById('case-'+b.dataset.case);if(!t)return;e.preventDefault();
    var y=t.getBoundingClientRect().top+scrollY-navOffset()-10;var RMo=matchMedia('(prefers-reduced-motion: reduce)').matches;scrollTo({top:Math.max(0,y),behavior:RMo?'auto':'smooth'})});
  function carSet(car,i){var lis=car.querySelectorAll('.proc li'),n=lis.length;if(!n)return;i=Math.max(0,Math.min(n-1,i));car.dataset.idx=i;
    lis.forEach(function(li,k){li.classList.toggle('act',k===i);li.setAttribute('aria-current',k===i?'step':'false')});
    var view=car.querySelector('.pcview'),ol=car.querySelector('.proc'),li=lis[i];
    var x=li.offsetLeft+li.offsetWidth/2-view.clientWidth/2;ol.style.transform='translateX('+(-x)+'px)';
    var c=car.querySelector('.pccount b');if(c)c.textContent=i+1;
    var bs=car.querySelectorAll('.pcarb');if(bs.length===2){bs[0].disabled=i===0;bs[1].disabled=i===n-1}}
  function carInit(){document.querySelectorAll('.pcar').forEach(function(car){if(car.dataset.v2)return;car.dataset.v2=1;var cur=+car.dataset.cur||0;carSet(car,cur);
    car.addEventListener('click',function(e){var b=e.target.closest('[data-pcar]');if(b){carSet(car,(+car.dataset.idx||0)+(+b.dataset.pcar));return}
      var li=e.target.closest('.proc li');if(li){carSet(car,[].indexOf.call(car.querySelectorAll('.proc li'),li))}});
    car.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();carSet(car,(+car.dataset.idx||0)+(e.key==='ArrowRight'?1:-1))}});
    var sx=null;car.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
    car.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)carSet(car,(+car.dataset.idx||0)+(dx<0?1:-1));sx=null},{passive:true})})}
  addEventListener('resize',function(){document.querySelectorAll('.pcar').forEach(function(c){carSet(c,+c.dataset.idx||0)})});
  function all(){carInit()}
  new MutationObserver(function(){clearTimeout(all.t);all.t=setTimeout(all,40)}).observe(document.body,{childList:true,subtree:true});
  addEventListener('load',all);all();
})();
(function(){var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.2}):null;
 function scan(){document.querySelectorAll('.montage:not([data-io])').forEach(function(m){m.dataset.io=1;if(io)io.observe(m);else m.classList.add('in')})}
 new MutationObserver(function(){clearTimeout(scan.t);scan.t=setTimeout(scan,40)}).observe(document.body,{childList:true,subtree:true});scan()})();
(function(){if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
 /* observe the row, not the clipped picture: a fully clipped element never counts as visible */
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var p=e.target.querySelector('.pic');if(p)p.classList.add('go');io.unobserve(e.target)}})},{threshold:.3});
 function scan(){document.querySelectorAll('.rb .pic:not(.v2rv)').forEach(function(p){if(p.closest('.rbtrack'))return;var row=p.closest('.rb');var r=row.getBoundingClientRect();if(r.top<innerHeight*.6&&r.bottom>0){p.classList.add('v2rv','go');return}p.classList.add('v2rv');io.observe(row)})}
 new MutationObserver(function(){clearTimeout(scan.t);scan.t=setTimeout(scan,60)}).observe(document.body,{childList:true,subtree:true});scan()})();
/* pass 12: reviews carousel arrows, film player */
(function(){
 function upd(w){var t=w.querySelector('.tptrack,.rbtrack'),p=w.querySelector('.tparr.prev'),n=w.querySelector('.tparr.next');if(!t)return;p.disabled=t.scrollLeft<8;n.disabled=t.scrollLeft+t.clientWidth>=t.scrollWidth-8}
 function init(){document.querySelectorAll('.tpwrap:not([data-v2]),.rbslider:not([data-v2])').forEach(function(w){w.dataset.v2=1;var t=w.querySelector('.tptrack,.rbtrack');
   w.querySelector('.tparr.prev').addEventListener('click',function(){t.scrollBy({left:-t.clientWidth*.9,behavior:'smooth'})});
   w.querySelector('.tparr.next').addEventListener('click',function(){t.scrollBy({left:t.clientWidth*.9,behavior:'smooth'})});
   t.addEventListener('scroll',function(){upd(w)},{passive:true});upd(w)})}
 new MutationObserver(function(){clearTimeout(init.t);init.t=setTimeout(init,60)}).observe(document.body,{childList:true,subtree:true});init();addEventListener('resize',function(){document.querySelectorAll('.tpwrap,.rbslider').forEach(upd)});
 function play(id){var src='https://stream.mux.com/'+id+'.m3u8';var ov=document.createElement('div');ov.className='filmov';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Film');
   ov.innerHTML='<button class="x" aria-label="Close">×</button><video controls playsinline autoplay poster="https://image.mux.com/'+id+'/thumbnail.jpg?time=4&width=1600"></video>';document.body.appendChild(ov);
   var v=ov.querySelector('video');function close(){try{v.pause()}catch(e){}if(v._hls)v._hls.destroy();ov.remove();removeEventListener('keydown',esc)}function esc(e){if(e.key==='Escape')close()}
   ov.querySelector('.x').onclick=close;ov.addEventListener('click',function(e){if(e.target===ov)close()});addEventListener('keydown',esc);
   if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src;return}
   function go(){if(window.Hls&&Hls.isSupported()){var h=new Hls();v._hls=h;h.loadSource(src);h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,function(){v.play().catch(function(){})})}else{close();open(src,'_blank','noopener')}}
   if(window.Hls)return go();var sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';sc.onload=go;sc.onerror=function(){close();open(src,'_blank','noopener')};document.head.appendChild(sc)}
 document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-film]');if(!b)return;e.preventDefault();play(b.dataset.film)});
})();
(function(){var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.25}):null;
 function scan(){document.querySelectorAll('.pennants:not([data-io])').forEach(function(m){m.dataset.io=1;if(io)io.observe(m);else m.classList.add('in')})}
 new MutationObserver(function(){clearTimeout(scan.t);scan.t=setTimeout(scan,50)}).observe(document.body,{childList:true,subtree:true});scan()})();
