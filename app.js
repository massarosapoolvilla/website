/* ============================================================
   MASSAROSSA POOL VILLA — app.js (оновлення 2026-08), частина 1/2
   Поглинає логіку старого index.html + pricing-engine.js + calendar3.js
   Залежності: rates.js (CONFIG/VILLAS/RATES/CLEAN/TAX/DISC/NY/PH/PLACES),
               i18n.js (I18N/LOCALES), leaflet, qrcode
   ============================================================ */

/* ---------- Хелпери ---------- */
function $(s){return document.querySelector(s)}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function villa(id){for(var i=0;i<VILLAS.length;i++){if(VILLAS[i].id===id)return VILLAS[i]}return null}
function hav(a,b,c,d){var R=6371,r=function(x){return x*Math.PI/180};var dl=r(c-a),dg=r(d-b)*Math.cos(r(a));return R*Math.sqrt(dl*dl+dg*dg)}
function photo(v,i){return "images/"+v.id+"/"+(i+1)+".jpg"}
function fb(i){return PH[i%PH.length]+"?auto=format&fit=crop&w=900&q=60"}

/* ---------- Мова ---------- */
var lang=localStorage.getItem("mv_lang")||"en";
function L(k){return (I18N[lang]&&I18N[lang][k])||I18N.en[k]||k}

/* ---------- Стан ---------- */
var curVilla=null,gIdx=0,calLock={m:false,g:false};
var forms={
  m:{villa:null,inD:null,outD:null,pre:function(f){return $("#m"+f)}},
  g:{villa:null,inD:null,outD:null,pre:function(f){return $("#g"+f)}}
};

/* ---------- Глобальний обробник помилок ---------- */
window.addEventListener("error",function(e){var b=$("#errbar");if(b){b.style.display="block";b.textContent="⚠️ "+e.message+" (line "+e.lineno+")"}});

/* ---------- applyLang + перемикач ---------- */
function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(function(el){el.textContent=L(el.dataset.i18n)});
  document.querySelectorAll("#langs button").forEach(function(b){b.classList.toggle("on",b.dataset.lang===lang)});
  renderCards();renderPlaces();buildSelects();
  if(curVilla)fillModal(curVilla,true);
  updDiscLang();
  scheduleRenderCal("m");scheduleRenderCal("g");
  calc("m");calc("g");
}
document.getElementById("langs").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  lang=b.dataset.lang;localStorage.setItem("mv_lang",lang);applyLang();
});

/* ---------- Картки вілл ---------- */
function renderCards(){
  var box=$("#cards");if(!box)return;box.innerHTML="";
  VILLAS.forEach(function(v,i){
    var el=document.createElement("div");el.className="vcard";
    el.innerHTML='<div class="vimg"><img loading="lazy" src="'+photo(v,0)+'" alt="'+esc(v.name)+'" onerror="this.onerror=null;this.src=\''+fb(i)+'\'">'
      +'<div class="vbadges"><div class="vprice">'+L("from")+" "+v.price.toLocaleString()+" <small>"+L("night")+"</small></div>"
      +'<div class="vnote">'+L("note")+"</div></div></div>"
      +'<div class="vbody"><h3>'+esc(v.name)+'</h3><div class="vtag">'+esc(v.tag)+'</div>'
      +'<div class="vspec">🛏 '+v.beds+" · 🛁 "+v.baths+" · 👥 "+v.guests+(v.extra?"+"+v.extra:"")+(v.tv?' · 📺 '+v.tv+'"':"")+"</div>"
      +'<div class="varea">'+v.area+" m²</div>"
      +'<div class="tags">'+v.amen.map(function(a){return '<span class="tag">'+L("am_"+a)+"</span>"}).join("")+"</div>"
      +'<div class="vbtns"><a class="btn ghost" href="'+v.id+'-villa.html">'+L("details")+"</a>"
      +'<button type="button" class="btn gold" data-act="book">'+L("book")+"</button></div></div>";
    el.querySelector('[data-act="book"]').addEventListener("click",function(){
      if(window.gtag)gtag("event","view_villa",{villa:v.id});
      openModal(v.id,true);
    });
    box.appendChild(el);
  });
}

/* ---------- «Поруч» ---------- */
function renderPlaces(){
  var box=$("#places");if(!box)return;box.innerHTML="";
  PLACES.forEach(function(p){
    var km=hav(CONFIG.lat,CONFIG.lng,p[1],p[2]);
    var r=document.createElement("div");r.className="prow";
    r.innerHTML="<span>"+L(p[0])+"</span><b>≈ "+km.toFixed(1)+" km</b>";
    box.appendChild(r);
  });
}

/* ---------- Селекти ---------- */
function buildSelects(){
  var sel=$("#gVilla");
  if(sel){
    sel.innerHTML="";
    var any=document.createElement("option");any.value="";any.textContent=L("f_any");sel.appendChild(any);
    VILLAS.forEach(function(v){var o=document.createElement("option");o.value=v.id;o.textContent=v.name;sel.appendChild(o)});
    if(forms.g.villa)sel.value=forms.g.villa;
  }
  ["#gGuests","#mGuests"].forEach(function(s){
    var g=$(s);if(!g)return;var cur=g.value;g.innerHTML="";
    for(var i=1;i<=10;i++){var o=document.createElement("option");o.value=i;o.textContent=i+" "+L("g_word");g.appendChild(o)}
    g.value=cur||"8";
  });
  var ms=$("#mVilla");
  if(ms){
    ms.innerHTML="";
    VILLAS.forEach(function(v){var o=document.createElement("option");o.value=v.id;o.textContent=v.name;ms.appendChild(o)});
    if(forms.m.villa)ms.value=forms.m.villa;
  }
}

/* ---------- Модалка + галерея ---------- */
function openModal(id,scroll){
  curVilla=id;forms.m.villa=id;
  var ms=$("#mVilla");if(ms)ms.value=id;
  fillModal(id,false);
  $("#mback").hidden=false;document.body.style.overflow="hidden";
  scheduleRenderCal("m");calc("m");
  if(scroll)setTimeout(function(){var f=$("#mForm");if(f)f.scrollIntoView({behavior:"smooth",block:"center"})},120);
}
function fillModal(id,keep){
  var v=villa(id);if(!v)return;
  if(!keep)gIdx=0;
  $("#mTitle").textContent=v.name;
  $("#mPrice").innerHTML='<span>'+L("from")+" "+v.price.toLocaleString()+"</span> <small>"+L("night")+"</small><div class='vnote mnote'>"+L("note")+"</div>";
  $("#mDesc").textContent=v.desc[lang]||v.desc.en;
  $("#mAmen").innerHTML=v.amen.map(function(a){return '<span class="tag">'+L("am_"+a)+"</span>"}).join("");
  $("#mWa").href="https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent("Hello! Interested in "+v.name+" at Massarossa.");
  $("#mLine").href=CONFIG.line;
  var shTxt=encodeURIComponent(v.name+" — Massarossa 🏝️"),shUrl=encodeURIComponent(location.href.split("#")[0]);
  $("#shWa").href="https://wa.me/?text="+shTxt+"%20"+shUrl;
  $("#shTg").href="https://t.me/share/url?url="+shUrl+"&text="+shTxt;
  $("#shNative").hidden=!navigator.share;
  showPhoto(v,0);
  var th=$("#gThumbs");th.innerHTML="";
  for(var i=0;i<PH.length;i++)(function(i){
    var im=document.createElement("img");im.src=fb(i);im.alt="";
    im.addEventListener("click",function(){showPhoto(v,i)});
    th.appendChild(im);
  })(i);
}
function showPhoto(v,i){
  gIdx=i;var main=$("#gMain");if(!main)return;
  main.onerror=function(){main.onerror=null;main.src=fb(i)};
  main.src=photo(v,i);
  var c=$("#gCount");if(c)c.textContent=(i+1)+" / "+PH.length;
  document.querySelectorAll("#gThumbs img").forEach(function(t,j){t.classList.toggle("on",j===i)});
}
function closeModal(){$("#mback").hidden=true;document.body.style.overflow=""}
/* ---------- Календар: 3 місяці в ряд + ‹ › (0..11) ---------- */
function scheduleRenderCal(k){if(calLock[k])return;calLock[k]=true;setTimeout(function(){calLock[k]=false;renderCal(k)},30)}
function renderCal(k){
  var F=forms[k],box=$("#"+(k==="m"?"mCal":"gCal"));if(!box)return;box.innerHTML="";if(!F.villa)return;
  if(F.mOff==null)F.mOff=0;
  var now=new Date(),loc=LOCALES[lang]||"en-GB",today=iso(new Date());
  var nav=document.createElement("div");nav.className="calnav";
  var pb=document.createElement("button");pb.type="button";pb.className="cnav";pb.textContent="‹";pb.disabled=F.mOff<=0;pb.onclick=function(){F.mOff--;renderCal(k)};
  var nb=document.createElement("button");nb.type="button";nb.className="cnav";nb.textContent="›";nb.disabled=F.mOff>=11;nb.onclick=function(){F.mOff++;renderCal(k)};
  var lbl=document.createElement("span");lbl.className="clbl";
  var mA=new Date(now.getFullYear(),now.getMonth()+F.mOff,1),mB=new Date(now.getFullYear(),now.getMonth()+F.mOff+2,1);
  var mf=new Intl.DateTimeFormat(loc,{month:"long",year:"numeric"});
  lbl.textContent=mf.format(mA)+" — "+mf.format(mB);
  nav.appendChild(pb);nav.appendChild(lbl);nav.appendChild(nb);box.appendChild(nav);
  var row=document.createElement("div");row.className="calrow";
  for(var m=0;m<3;m++){
    var d=new Date(now.getFullYear(),now.getMonth()+F.mOff+m,1);
    var md=document.createElement("div");md.className="cmonth";
    var tt=document.createElement("div");tt.className="ctitle";tt.textContent=mf.format(d);md.appendChild(tt);
    var gr=document.createElement("div");gr.className="cgrid";
    var wd=new Intl.DateTimeFormat(loc,{weekday:"narrow"});
    for(var w=0;w<7;w++){var h=document.createElement("span");h.className="cw";h.textContent=wd.format(new Date(2024,0,1+w));gr.appendChild(h)}
    var first=(new Date(d.getFullYear(),d.getMonth(),1).getDay()+6)%7;
    var days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    for(var b=0;b<first;b++)gr.appendChild(document.createElement("span"));
    for(var day=1;day<=days;day++)(function(day){
      var dt=new Date(d.getFullYear(),d.getMonth(),day),s=iso(dt);
      var c=document.createElement("button");c.type="button";c.className="cd";c.textContent=day;
      if(s===today)c.classList.add("today");
      if(s<today){c.classList.add("past");c.disabled=true}
      else if(isBusy(F.villa,s)){c.classList.add("busy");c.disabled=true}
      else{
        if(s===F.inD||s===F.outD)c.classList.add("sel");
        else if(F.inD&&F.outD&&s>F.inD&&s<F.outD)c.classList.add("inr");
        c.addEventListener("click",function(){pickDay(k,s)});
      }
      gr.appendChild(c);
    })(day);
    md.appendChild(gr);row.appendChild(md);
  }
  box.appendChild(row);
  var leg=document.createElement("div");leg.className="cleg";
  leg.innerHTML='<span><i style="background:#0e1613;border:1px solid var(--line)"></i>'+L("cal_free")+'</span><span><i style="background:#3a1713"></i>'+L("cal_busy")+'</span><span><i style="background:var(--gold)"></i>'+L("cal_sel")+"</span>";
  box.appendChild(leg);
}
function pickDay(k,d){
  var F=forms[k];
  if(!F.inD||(F.inD&&F.outD)){F.inD=d;F.outD=null}
  else if(d<=F.inD){F.inD=d;F.outD=null}
  else if(Math.round((Date.parse(d)-Date.parse(F.inD))/864e5)>30){alert(L("e_range"));F.inD=d;F.outD=null}
  else if(rangeBusy(F.villa,F.inD,d)){alert(L("e_busy"));F.inD=d;F.outD=null}
  else F.outD=d;
  F.pre("In").value=F.inD||"";F.pre("Out").value=F.outD||"";
  scheduleRenderCal(k);calc(k);
}

/* ---------- iCal-зайнятість (проксі-ланцюжок, виправлений порядок) ---------- */
function icsParse(t){
  var out=[],parts=String(t).split("BEGIN:VEVENT");
  for(var i=1;i<parts.length;i++){
    var ms=parts[i].match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/);
    var me=parts[i].match(/DTEND[^:]*:(\d{4})(\d{2})(\d{2})/);
    if(!ms)continue;
    out.push([ms[1]+"-"+ms[2]+"-"+ms[3], me?me[1]+"-"+me[2]+"-"+me[3] : ms[1]+"-"+ms[2]+"-"+ms[3]]);
  }
  return out;
}
function isBusy(vId,s){var r=CONFIG.busy[vId]||[];for(var i=0;i<r.length;i++){if(s>=r[i][0]&&s<=r[i][1])return true}return false}
function rangeBusy(vId,a,b){var d=new Date(a+"T00:00:00"),end=new Date(b+"T00:00:00");while(d<end){if(isBusy(vId,iso(d)))return true;d.setDate(d.getDate()+1)}return false}
var ICAL_PROXIES=[
  function(u){return "/ical.php?url="+encodeURIComponent(u)}
];
function loadBusy(vId,done){
  var urls=CONFIG.ical[vId]||[],left=urls.length;
  if(!left){done&&done();return}
  urls.forEach(function(u){
    (function tryP(p){
      if(p>=ICAL_PROXIES.length){if(--left<=0)done&&done();return}
      fetch(ICAL_PROXIES[p](u)).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(t){
        CONFIG.busy[vId]=(CONFIG.busy[vId]||[]).concat(icsParse(t));
        if(--left<=0)done&&done();
      }).catch(function(){tryP(p+1)});
    })(0);
  });
}
function loadAllBusy(){VILLAS.forEach(function(v){loadBusy(v.id,function(){scheduleRenderCal("m");scheduleRenderCal("g")})})}

/* ---------- Ціни: сезон × день × тривалість + CLEAN + TAX + DISC ---------- */
function isLow(d){var m=d.getMonth()+1,dd=d.getDate();
  if((m===NY.m1&&dd>=NY.d1)||(m===NY.m2&&dd<=NY.d2))return false;
  if(m>4&&m<11)return true;if(m===4)return dd>=20;if(m===11)return dd<=15;return false}
function nightRate(vId,s,n){
  var d=new Date(s+"T00:00:00"),m=d.getMonth()+1,dd=d.getDate();
  if((m===NY.m1&&dd>=NY.d1)||(m===NY.m2&&dd<=NY.d2))return vId==="king"?NY.king:NY.other;
  var R=RATES[vId][isLow(d)?"low":"high"],we=(d.getDay()===5||d.getDay()===6);
  if(isLow(d)){if(n<=6)return we?R.s[0]:R.s[1];if(n<=15)return R.m;return R.l}
  if(n<=3)return we?R.s[0]:R.s[1];if(n<=7)return R.a;if(n<=15)return R.b;return R.l;
}
function mkDisc(k){
  var pp=$("#"+k+"Prepay");if(!pp||$("#"+k+"Disc"))return;
  var d=document.createElement("div");d.className="dbox";d.id=k+"Disc";d.hidden=true;
  d.innerHTML='<button type="button" class="btn ghost" id="'+k+'DiscBtn"></button><label class="dchk"><input type="checkbox" id="'+k+'Sub"> <span id="'+k+'SubTxt"></span></label>';
  pp.parentNode.insertBefore(d,pp.nextSibling);
}
function updDiscLang(){["m","g"].forEach(function(k){var b=$("#"+k+"DiscBtn"),c=$("#"+k+"SubTxt");if(b)b.textContent=L("disc_btn");if(c)c.textContent=L("disc_chk")})}
function wireDisc(k){
  var b=$("#"+k+"DiscBtn"),cb=$("#"+k+"Sub");
  if(b)b.onclick=function(){window.open(CONFIG.social.fb,"_blank");window.open(CONFIG.social.wa,"_blank")};
  if(cb)cb.onchange=function(){calc(k)};
}
function calc(k){
  var F=forms[k],t=$("#"+(k==="m"?"mTotal":"gTotal")),pp=$("#"+(k==="m"?"mPrepay":"gPrepay")),db=$("#"+k+"Disc"),cb=$("#"+k+"Sub");
  if(!t)return 0;
  var v=F.villa?villa(F.villa):null;
  if(v&&F.inD&&F.outD){
    var n=Math.round((Date.parse(F.outD)-Date.parse(F.inD))/864e5);
    if(n>0&&n<=60){
      var sub=0;for(var i=0;i<n;i++){sub+=nightRate(v.id,iso(new Date(Date.parse(F.inD)+i*864e5)),n)}
      var disc=(n>4&&cb&&cb.checked)?Math.round(sub*DISC/100):0;
      var tax=Math.round((sub-disc+CLEAN)*TAX/100);
      var tot=sub-disc+CLEAN+tax;
      t.hidden=false;
      t.innerHTML="🧮 "+n+" "+L("f_nights")+": ฿"+sub.toLocaleString()
        +"<br>🧹 "+L("clean_lbl")+": ฿"+CLEAN.toLocaleString()
        +"<br>🏛 "+L("tax_lbl")+": ฿"+tax.toLocaleString()
        +(disc?"<br>🎉 "+L("disc_lbl")+": −฿"+disc.toLocaleString():"")
        +"<br>💰 "+L("f_total")+": <b>฿"+tot.toLocaleString()+"</b>"
        +"<br><small>"+L("note")+"</small>";
      if(db)db.hidden=n<=4;
      if(CONFIG.paypal&&pp){pp.hidden=false;var pre=Math.round(tot*CONFIG.prepay/100);
        pp.textContent="💳 "+L("f_prepay")+" ("+CONFIG.prepay+"%): ฿"+pre.toLocaleString();
        pp.dataset.amt=pre;pp.dataset.v=v.name;}
      return tot;
    }
  }
  t.hidden=true;if(pp)pp.hidden=true;if(db)db.hidden=true;return 0;
}

/* ---------- Дати/селекти ---------- */
function onDateChange(k){
  var F=forms[k];F.inD=F.pre("In").value||null;F.outD=F.pre("Out").value||null;
  if(F.inD&&F.outD){
    var n=Math.round((Date.parse(F.outD)-Date.parse(F.inD))/864e5);
    if(n<1||n>30){F.inD=null;F.outD=null;F.pre("In").value="";F.pre("Out").value="";alert(n<1?L("e_dates"):L("e_range"))}
    else if(F.villa&&rangeBusy(F.villa,F.inD,F.outD)){F.inD=null;F.outD=null;F.pre("In").value="";F.pre("Out").value="";alert(L("e_busy"))}
  }
  scheduleRenderCal(k);calc(k);
}

/* ---------- Форми → WhatsApp ---------- */
function submitForm(k,e){
  e.preventDefault();
  var F=forms[k],v=F.villa?villa(F.villa):null;
  var name=F.pre("Name").value.trim(),phone=F.pre("Phone").value.trim();
  if(!name){alert(L("e_name"));return}
  if(!phone){alert(L("e_phone"));return}
  if(!F.inD||!F.outD){alert(L("e_dates"));return}
  var n=Math.round((Date.parse(F.outD)-Date.parse(F.inD))/864e5);
  if(n>30){alert(L("e_range"));return}
  var msg="🏝 Massarossa Pool Villa Pattaya\n"+L("f_villa")+": "+(v?v.name:L("f_any"))
    +"\n"+L("f_in")+": "+F.inD+"\n"+L("f_out")+": "+F.outD+" ("+n+" "+L("f_nights")+")";
  if(v)msg+="\n"+L("f_total")+": ฿"+(n*v.price).toLocaleString();
  msg+="\n"+L("f_name")+": "+name+"\n"+L("f_phone")+": "+phone
    +"\n"+L("f_g")+": "+F.pre("Guests").value+"\n"+L("f_req")+": "+(F.pre("Req").value||"—");
  if(window.gtag)gtag("event","generate_lead",{villa:v?v.id:"any",nights:n});
  window.open("https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent(msg),"_blank");
}

/* ---------- Карта / QR / друк / маршрути ---------- */
var leafletMap=null;
function fixMapSize(){if(leafletMap)setTimeout(function(){try{leafletMap.invalidateSize()}catch(e){}},60)}
function initMap(){
  console.log('🗺️ Initializing map...');
  var mapContainer = document.getElementById("map");
  if(!mapContainer) return;
  
  // Вбудований Google Maps iframe
  mapContainer.innerHTML = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3875.' + 
    '8!2d100.8986733!3d12.9459773!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!' +
    '2zMTLCsDU2JzQ1LjUiTiAxMDDCsDUzJzU1LjIiRQ!5e0!3m2!1sen!2sth!4v1234567890" ' +
    'width="100%" height="100%" style="border:0;border-radius:18px;" allowfullscreen="" loading="lazy" ' +
    'referrerpolicy="no-referrer-when-downgrade"></iframe>';
  
  console.log('✅ Map loaded via Google Maps iframe');
}
function fillPrintArea(){
  var url="";var c=document.querySelector("#qrBox canvas");if(c&&c.toDataURL)url=c.toDataURL("image/png");
  if(!url){var im=document.querySelector("#qrBox img");if(im)url=im.src}
  var pa=$("#printArea");if(pa&&url)pa.innerHTML='<h2>Massarossa Pool Villa Pattaya</h2><p>384/28 Moo 6, Soi 12, North Pattaya Rd, Bang Lamung, Chonburi 20150</p><p>WhatsApp +66 63 446 7395 · Line @lucy.cpn</p><img src="'+url+'" alt="QR"><p>'+CONFIG.mapsLink+"</p>";
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded",function(){
  document.querySelectorAll("section").forEach(function(s){s.classList.add("rv")});
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add("vis");io.unobserve(x.target)}})},{threshold:.12});
    document.querySelectorAll(".rv").forEach(function(e){io.observe(e)});
  }else document.querySelectorAll(".rv").forEach(function(e){e.classList.add("vis")});
  mkDisc("m");mkDisc("g");wireDisc("m");wireDisc("g");
  var gv=$("#gVilla");if(gv)gv.addEventListener("change",function(){forms.g.villa=this.value||null;scheduleRenderCal("g");calc("g")});
  var mv=$("#mVilla");if(mv)mv.addEventListener("change",function(){forms.m.villa=this.value;curVilla=this.value;scheduleRenderCal("m");calc("m")});
  ["m","g"].forEach(function(k){["In","Out"].forEach(function(f){var el=forms[k].pre(f);if(el)el.addEventListener("change",function(){onDateChange(k)})})});
  $("#mForm").addEventListener("submit",function(e){submitForm("m",e)});
  $("#gForm").addEventListener("submit",function(e){submitForm("g",e)});
  ["mPrepay","gPrepay"].forEach(function(id){var el=document.getElementById(id);if(!el)return;
    el.addEventListener("click",function(){
      var u=CONFIG.paypal;if(!u||!u.trim())return;
      var amt=this.dataset.amt,vn=this.dataset.v;
      if(u.indexOf("@")>-1)u="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business="+encodeURIComponent(u)+"&amount="+amt+"&currency_code=THB&item_name="+encodeURIComponent("Massarossa prepayment — "+vn);
      window.open(u,"_blank");
    })});
  $("#mclose").addEventListener("click",closeModal);
  $("#mback").addEventListener("click",function(e){if(e.target===this)closeModal()});
  $("#gPrev").addEventListener("click",function(){if(curVilla)showPhoto(villa(curVilla),(gIdx+PH.length-1)%PH.length)});
  $("#gNext").addEventListener("click",function(){if(curVilla)showPhoto(villa(curVilla),(gIdx+1)%PH.length)});
  $("#shNative").addEventListener("click",function(){var v=villa(curVilla);if(navigator.share&&v)navigator.share({title:v.name,text:v.name+" — Massarossa 🏝️",url:location.href.split("#")[0]})});
  $("#cWa").href="https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent("Hello! Massarossa Pool Villa 🏝️");
  $("#cLine").href=CONFIG.line;
  $("#cRoute").href="https://www.google.com/maps/dir/?api=1&destination="+CONFIG.lat+","+CONFIG.lng;
  $("#rGoogle").href="https://www.google.com/maps/dir/?api=1&destination="+CONFIG.lat+","+CONFIG.lng;
  $("#rApple").href="https://maps.apple.com/?daddr="+CONFIG.lat+","+CONFIG.lng+"&dirflg=d";
  $("#fwa").href="https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent("Hello! Booking villa at Massarossa 🏝️");
  $("#qrPrint").addEventListener("click",function(){window.print()});
  applyLang();
  loadAllBusy();
  initMap();
  try{if(window.QRCode)new QRCode($("#qrBox"),{text:CONFIG.mapsLink,width:150,height:150})}catch(e){}
  setTimeout(fillPrintArea,150);
});
