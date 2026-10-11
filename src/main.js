import './style.css';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { exportPdf } from './pdf.js';
import { zoomAroundPoint, centerElementInView } from './viewport.js';
import { setupInlineSignatureImport, renderSignature } from './inline-signature.js';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const icons = { upload:'↑', signature:'〰', text:'T', download:'↓', close:'×' };
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="./"><span class="brand-mark">e<span>✓</span></span>easy<span class="brand-light">sign</span><span class="badge">PDF</span></a><span class="header-note"><span class="green-dot"></span> Vos documents restent sur votre appareil</span><button id="new-document" class="quiet" hidden>Nouveau PDF</button></header>
<main><section id="welcome"><div class="eyebrow">MOINS DE PAPIER. PLUS DE SIMPLICITÉ.</div><h1>Un PDF à remplir ?<br><span>C’est déjà presque fait.</span></h1><p class="intro">Une signature, quelques mots, et c’est signé.<br>Tout se passe ici, sur votre appareil.</p><div class="start-layout"><div id="dropzone" class="upload-card"><div class="upload-icon">${icons.upload}</div><h2>Votre document commence ici</h2><p>Glissez votre PDF, ou choisissez un fichier.</p><button id="open-pdf" class="primary">Choisir un PDF <span>↗</span></button><small>PDF • jusqu’à 30 Mo</small></div><div class="sample-card"><span class="sample-label">AUSSI SIMPLE QUE ÇA</span><div class="paper"><span class="paper-title">Le début d’un beau projet.</span><div class="paper-line"></div><div class="paper-line short"></div><div class="mock-text">Camille Martin <span>↗</span></div><div class="paper-line"></div><span class="paper-caption">Signature</span><div class="mock-sign">Camille<span class="mock-handle"></span></div></div><span class="sample-foot">Une touche personnelle. En quelques gestes.</span></div></div><button id="demo" class="demo-button">Juste pour essayer ? Ouvrir un PDF de démonstration <span>→</span></button><div class="benefits"><div><span>01</span><strong>Ouvrez votre PDF</strong><p>Un contrat, un formulaire, une autorisation…</p></div><div><span>02</span><strong>Ajoutez votre touche</strong><p>Du texte et votre signature, où vous voulez.</p></div><div><span>03</span><strong>Téléchargez. C’est prêt.</strong><p>Votre PDF rempli, prêt à être partagé.</p></div></div></section>
<section id="editor" hidden><div class="editor-heading"><div><div class="eyebrow">VOTRE ESPACE DE SIGNATURE</div><h1 id="filename"></h1></div><button id="export" class="primary">${icons.download} Télécharger <span class="desktop-label">le PDF</span></button></div><div class="workspace"><aside><div class="panel-title">À vous de jouer</div><p class="panel-description">Ajoutez un élément, puis placez-le sur la page.</p><button id="add-text" class="tool"><span class="tool-icon">T</span><span><strong>Ajouter du texte</strong><small>Remplir les champs</small></span><span>+</span></button><button id="add-signature" class="tool"><span class="tool-icon">〰</span><span><strong>Votre signature</strong><small>Importer un PNG transparent</small></span><span>+</span></button><div id="properties" hidden><div class="divider"></div><div class="panel-title">Élément sélectionné</div><label id="text-label">Votre texte<textarea id="text-value" rows="3" placeholder="Votre texte…"></textarea></label><label>Taille <input id="item-size" type="range" min="1" max="100" value="30"></label><button id="delete-item" class="danger">Supprimer l’élément</button></div><div class="tip"><span>✧</span><p>Déplacez les éléments au doigt ou à la souris. La poignée du coin ajuste leur taille.</p></div><div id="element-count" class="element-count">Aucun élément ajouté</div></aside><div class="document-area"><div class="page-toolbar"><div><button id="prev" class="icon-button" aria-label="Page précédente">‹</button><span id="page-info">Page 1 / 1</span><button id="next" class="icon-button" aria-label="Page suivante">›</button></div><span class="fit-label">Ajusté à l’écran</span></div><div id="page-scroll"><div id="page-stage"><canvas id="pdf-canvas"></canvas><div id="overlays"></div></div></div></div></div></section></main><footer><span>Un petit geste. Un document prêt.</span><span>100 % dans votre navigateur <span class="green-dot"></span></span></footer><input id="pdf-input" type="file" accept="application/pdf,.pdf" hidden><input id="signature-input" type="file" accept="image/png,.png" hidden><div id="status" role="status" aria-live="polite"></div>`;

const $ = (id) => document.getElementById(id);
const homeFeatures=document.createElement('div');homeFeatures.className='home-features';homeFeatures.innerHTML='<span>✎ Texte directement sur le PDF</span><span>〰 Signature PNG ou JPG</span><span>✧ Retrait du fond clair</span>';document.querySelector('.start-layout').before(homeFeatures);
const gestureHint=document.createElement('p');gestureHint.className='gesture-hint';gestureHint.textContent='Touchez un élément pour le modifier. Faites-le glisser pour le déplacer ; tirez le rond vert pour changer sa taille.';document.querySelector('.page-toolbar').after(gestureHint);
const fontFamilies = { Helvetica: 'Arial, sans-serif', TimesRoman: '"Times New Roman", serif', Courier: '"Courier New", monospace' };
$('item-size').parentElement.remove();
const undoButton = document.createElement('button'); undoButton.id='undo';undoButton.className='quiet';undoButton.textContent='↶ Annuler la dernière action';undoButton.disabled=true;$('add-text').before(undoButton);
const history = [];
function checkpoint(){history.push(JSON.stringify(items.filter(item=>item.type!=='text'||item.text.trim())));if(history.length>40)history.shift();undoButton.disabled=false;}
undoButton.onclick=()=>{if(!history.length)return;items=JSON.parse(history.pop());selected=null;renderItems();updateProperties();undoButton.disabled=!history.length;};
let bytes, pdf, pageNumber = 1, items = [], selected = null, geometries = {}, filename = '', rendering = false, rerender = false;
let signatureData = null, signatureRatio = 3;
let editingId = null;
let zoom = 1, pendingAnchor = null;
const dock=document.createElement('nav');dock.className='floating-tools';dock.setAttribute('aria-label','Outils du document');
undoButton.textContent='↶ Annuler';
dock.append($('add-text'),$('add-signature'),undoButton);$('editor').append(dock);
const editButton=document.createElement('button');editButton.id='edit-selected';editButton.className='quiet';editButton.textContent='✎ Modifier';editButton.hidden=true;dock.append(editButton);
editButton.onclick=()=>{const item=items.find(item=>item.id===selected);if(!item)return;if(item.type==='signature')return signatureImporter.open(selected);checkpoint();editingId=selected;renderItems();focusInlineText();updateProperties();};
const selectionTools=document.createElement('div');selectionTools.className='selection-tools';selectionTools.hidden=true;$('editor').append(selectionTools);selectionTools.append(editButton);
const deleteButton=document.createElement('button');deleteButton.className='quiet';deleteButton.textContent='Supprimer';deleteButton.onclick=()=>removeSelected();selectionTools.append(deleteButton);
const signatureTools=document.createElement('div');signatureTools.className='inline-signature-tools';signatureTools.hidden=true;signatureTools.innerHTML='<label><input id="clean-signature" type="checkbox"> Retirer le fond</label><label>Nettoyage <input id="clean-strength" type="range" min="0" max="100" value="50"></label>';$('editor').append(signatureTools);
const signatureSources=new Map();
function focusInlineText(){const el=$('overlays').querySelector('.text-content[contenteditable="true"]');if(!el)return;el.focus({preventScroll:true});const range=document.createRange();range.selectNodeContents(el);range.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);scheduleElementCenter();}
document.querySelector('aside').remove();
document.querySelector('.fit-label').remove();
const firstPageButton=document.createElement('button');firstPageButton.id='first-page';firstPageButton.className='icon-button';firstPageButton.textContent='«';firstPageButton.setAttribute('aria-label','Première page');firstPageButton.title='Première page';$('prev').before(firstPageButton);
const lastPageButton=document.createElement('button');lastPageButton.id='last-page';lastPageButton.className='icon-button';lastPageButton.textContent='»';lastPageButton.setAttribute('aria-label','Dernière page');lastPageButton.title='Dernière page';$('next').after(lastPageButton);
function goToPage(number){if(!pdf||number===pageNumber)return;documentMenu.close();pageNumber=number;selected=null;editingId=null;updateProperties();$('page-scroll').scrollTo(0,0);renderPage();}
firstPageButton.onclick=()=>goToPage(1);lastPageButton.onclick=()=>goToPage(pdf.numPages);
const zoomControls=document.createElement('div');zoomControls.className='zoom-controls';zoomControls.innerHTML='<button id="zoom-out" class="icon-button" aria-label="Réduire le zoom">−</button><output id="zoom-level" aria-live="polite">100 %</output><button id="zoom-in" class="icon-button" aria-label="Agrandir le PDF">+</button><button id="zoom-fit" class="quiet">Ajuster</button>';document.querySelector('.page-toolbar').append(zoomControls);
const documentMenu=document.createElement('dialog');documentMenu.className='document-menu';documentMenu.id='document-menu';documentMenu.innerHTML='<div class="properties-heading"><strong>Votre document</strong><button class="quiet" id="close-document-menu">Fermer ×</button></div><div class="menu-title"></div><h2>Aller à une page</h2><div class="menu-navigation"></div><h2>Zoom du PDF</h2><div class="menu-zoom"></div><div class="menu-actions"></div>';
document.body.append(documentMenu);
documentMenu.querySelector('.menu-title').append($('filename'));
const pageToolbar=document.querySelector('.page-toolbar');documentMenu.querySelector('.menu-navigation').append(pageToolbar.firstElementChild);documentMenu.querySelector('.menu-zoom').append(zoomControls);pageToolbar.remove();
documentMenu.querySelector('.menu-actions').append($('new-document'));documentMenu.append(gestureHint);
const compactBar=document.createElement('div');compactBar.className='compact-document-bar';compactBar.innerHTML='<button id="open-document-menu" class="quiet" aria-haspopup="dialog" aria-controls="document-menu">☰ Menu</button><button id="compact-page" class="quiet" aria-haspopup="dialog" aria-controls="document-menu">Page 1 ▾</button>';
compactBar.append($('export'));$('editor').prepend(compactBar);document.querySelector('.editor-heading').remove();
for(const id of ['open-document-menu','compact-page'])$(id).onclick=()=>documentMenu.showModal();$('close-document-menu').onclick=()=>documentMenu.close();
documentMenu.addEventListener('click',(e)=>{if(e.target!==documentMenu)return;const r=documentMenu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)documentMenu.close();});
const content=document.createElement('div');content.id='page-content';$('page-stage').before(content);content.append($('page-stage'));
function fitWidth(){return Math.max(180,$('page-scroll').clientWidth-(window.innerWidth<600?16:48));}
function updateZoomControls(){ $('zoom-level').textContent=`${Math.round(zoom*100)} %`;$('zoom-out').disabled=zoom<=.5;$('zoom-in').disabled=zoom>=3; }
function setZoom(value,clientX,clientY,live=false){
  if(!pdf)return;
  const scroll=$('page-scroll'),scrollRect=scroll.getBoundingClientRect(),stage=$('page-stage'),rect=stage.getBoundingClientRect();
  const px=clientX??scrollRect.left+scroll.clientWidth/2,py=clientY??scrollRect.top+Math.min(scroll.clientHeight/2,rect.height/2);
  const next=Math.min(3,Math.max(.5,value));if(next===zoom)return;
  pendingAnchor={x:(px-rect.left)/rect.width,y:(py-rect.top)/rect.height,px:px-scrollRect.left,py:py-scrollRect.top};zoom=next;updateZoomControls();
  const g=geometries[pageNumber],width=fitWidth()*zoom;stage.style.width=`${width}px`;stage.style.height=`${width*g.height/g.width}px`;
  restoreAnchor();renderItems();if(!live)renderPage();
}
function restoreAnchor(){if(!pendingAnchor)return;const scroll=$('page-scroll'),rect=scroll.getBoundingClientRect(),stage=$('page-stage').getBoundingClientRect();const position=zoomAroundPoint({scrollLeft:scroll.scrollLeft,scrollTop:scroll.scrollTop,stageLeft:stage.left-rect.left,stageTop:stage.top-rect.top,width:stage.width,height:stage.height,...pendingAnchor});scroll.scrollLeft=position.left;scroll.scrollTop=position.top;pendingAnchor=null;}
$('zoom-in').onclick=()=>setZoom(zoom+.25);$('zoom-out').onclick=()=>setZoom(zoom-.25);$('zoom-fit').onclick=()=>{setZoom(1);$('page-scroll').scrollTo({left:0,top:0});documentMenu.close();};
$('page-scroll').addEventListener('wheel',(e)=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.003),e.clientX,e.clientY);},{passive:false});
let pinch=null;
// Cancel native page zoom without stopping the PDF's own pinch handlers.
for(const event of ['touchstart','touchmove'])document.addEventListener(event,(e)=>{
  if(e.touches.length>1&&e.cancelable)e.preventDefault();
},{capture:true,passive:false});
// Safari also emits proprietary gesture events for native pinch zoom.
for(const event of ['gesturestart','gesturechange','gestureend'])document.addEventListener(event,(e)=>{
  if(e.cancelable)e.preventDefault();
},{passive:false});
function touchDistance(touches){return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);}
$('page-scroll').addEventListener('touchstart',(e)=>{if(e.touches.length!==2)return;pinch={distance:touchDistance(e.touches),zoom};e.preventDefault();},{passive:false});
$('page-scroll').addEventListener('touchmove',(e)=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();setZoom(pinch.zoom*touchDistance(e.touches)/pinch.distance,(e.touches[0].clientX+e.touches[1].clientX)/2,(e.touches[0].clientY+e.touches[1].clientY)/2,true);},{passive:false});
for(const event of ['touchend','touchcancel'])$('page-scroll').addEventListener(event,(e)=>{if(pinch&&e.touches.length<2){pinch=null;renderPage();}});
if(window.visualViewport){const adjustViewport=()=>{const v=window.visualViewport;const offset=Math.max(0,window.innerHeight-v.height-v.offsetTop);document.documentElement.style.setProperty('--keyboard-offset',`${offset}px`);document.documentElement.style.setProperty('--visible-height',`${v.height}px`);document.body.classList.toggle('keyboard-open',offset>100);scheduleElementCenter();};window.visualViewport.addEventListener('resize',adjustViewport);window.visualViewport.addEventListener('scroll',adjustViewport);}
let centerFrame=null;
function scheduleElementCenter(){
  if(centerFrame!==null)cancelAnimationFrame(centerFrame);
  centerFrame=requestAnimationFrame(()=>{centerFrame=null;centerSelectedElement();});
}
function centerSelectedElement(){
  const scroll=$('page-scroll');
  if(editingId!==selected||!selected){scroll.style.removeProperty('--editing-space');$('page-content').style.removeProperty('--editing-side-space');return;}
  const el=Array.from($('overlays').children).find(el=>el.dataset.id===selected);if(!el)return;
  const viewport=window.visualViewport;
  const area=scroll.getBoundingClientRect();
  const visible={left:Math.max(area.left,viewport?.offsetLeft||0)+18,top:Math.max(area.top,viewport?.offsetTop||0)+18,right:Math.min(area.right,(viewport?.offsetLeft||0)+(viewport?.width||window.innerWidth))-18,bottom:Math.min(area.bottom,(viewport?.offsetTop||0)+(viewport?.height||window.innerHeight))-18};
  if(!document.body.classList.contains('keyboard-open'))visible.bottom=Math.min(visible.bottom,dock.getBoundingClientRect().top-65);
  scroll.style.setProperty('--editing-space',`${Math.max(135,area.bottom-visible.bottom+area.height/2)}px`);$('page-content').style.removeProperty('--editing-side-space');
  if(visible.bottom<=visible.top||visible.right<=visible.left)return;
  const position=centerElementInView({scrollLeft:scroll.scrollLeft,scrollTop:scroll.scrollTop,element:el.getBoundingClientRect(),visible});
  scroll.scrollTo({left:position.left,top:position.top,behavior:'instant'});
}
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
function notify(message) { $('status').textContent = message; $('status').classList.add('visible'); clearTimeout(notify.timer); notify.timer = setTimeout(() => $('status').classList.remove('visible'), 5000); }
async function openDocument(data, name) {
  try {
    const original = new Uint8Array(data);
    // Validate export compatibility before opening (encrypted PDFs are unsupported).
    await PDFDocument.load(original);
    const nextPdf = await pdfjs.getDocument({ data: original.slice(), isEvalSupported: false }).promise;
    if (pdf) await pdf.destroy();
    bytes = original; pdf = nextPdf; filename = name; pageNumber = 1; items = []; selected = null; geometries = {}; history.length=0;undoButton.disabled=true;
    for (let p = 1; p <= pdf.numPages; p++) { const vp = (await pdf.getPage(p)).getViewport({scale:1}); geometries[p] = {width:vp.width,height:vp.height}; }
    $('welcome').hidden = true; $('editor').hidden = false; $('new-document').hidden = false; $('filename').textContent = name;document.body.classList.add('editing');zoom=1;updateZoomControls();$('page-scroll').scrollTo(0,0);
    await renderPage(); updateProperties();
  } catch (err) { console.error(err); notify('Impossible d’ouvrir ce PDF. Vérifiez qu’il est valide et non protégé par un mot de passe.'); }
}
async function readFile(file) { if (!file) return; if (file.size > 30 * 1024 * 1024) return notify('Choisissez un PDF de moins de 30 Mo.'); await openDocument(await file.arrayBuffer(), file.name); }
async function renderPage() {
  if (!pdf) return;
  if (rendering) { rerender = true; return; }
  rendering = true;
  try {
    const page = await pdf.getPage(pageNumber); const original = page.getViewport({scale:1});
    const width = fitWidth()*zoom; const vp = page.getViewport({scale:width/original.width});
    const canvas = $('pdf-canvas'), dpr = Math.min(window.devicePixelRatio || 1, 2,4096/Math.max(vp.width,vp.height));
    canvas.width = Math.round(vp.width*dpr); canvas.height = Math.round(vp.height*dpr);
    $('page-stage').style.width = `${vp.width}px`; $('page-stage').style.height = `${vp.height}px`;
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp,transform:[dpr,0,0,dpr,0,0]}).promise;
    $('page-info').textContent = `Page ${pageNumber} / ${pdf.numPages}`;$('compact-page').textContent=`${pageNumber} / ${pdf.numPages} ▾`;$('compact-page').setAttribute('aria-label',`Page ${pageNumber} sur ${pdf.numPages}, ouvrir la navigation`); $('prev').disabled = firstPageButton.disabled = pageNumber === 1; $('next').disabled = lastPageButton.disabled = pageNumber === pdf.numPages; renderItems();
  } catch (err) { console.error(err); notify('L’affichage de cette page a échoué.'); }
  finally { rendering = false; if (rerender) { rerender = false; renderPage(); } }
}
function renderItems() {
  scheduleElementCenter();
  $('overlays').replaceChildren();
  const width = $('page-stage').clientWidth;
  for (const item of items.filter(x => x.page === pageNumber)) {
    const el = document.createElement('div'); el.className = `placed ${selected === item.id ? 'selected' : ''}`; el.dataset.id = item.id;
    Object.assign(el.style,{left:`${item.x*100}%`,top:`${item.y*100}%`,width:`${item.w*100}%`,height:`${item.h*100}%`,fontSize:`${item.size*width}px`});
    if (item.type === 'text') {
      const text=document.createElement('div');text.className='text-content';text.dataset.placeholder='Écrivez ici…';text.textContent=item.text;text.contentEditable=editingId===item.id?'plaintext-only':'false';text.setAttribute('aria-label','Votre texte');text.spellcheck=false;
      text.oninput=()=>{item.text=text.innerText.replace(/\r/g,'');measureText(item);Object.assign(el.style,{width:`${item.w*100}%`,height:`${item.h*100}%`,left:`${item.x*100}%`,top:`${item.y*100}%`});scheduleElementCenter();};
      text.onblur=()=>{if(editingId===item.id)editingId=null;setTimeout(()=>{discardEmptyText();updateSelection();},0);};
      el.append(text);el.style.fontFamily=fontFamilies[item.font||'Helvetica'];el.style.lineHeight=item.lineHeight||1.2;
    }
    else { const img = document.createElement('img'); img.src = item.data; img.draggable = false; img.alt = 'Signature'; el.append(img); }
    const handle = document.createElement('button'); handle.className = 'resize-handle'; handle.setAttribute('aria-label','Redimensionner'); el.append(handle);
    el.tabIndex = 0; el.setAttribute('aria-label',item.type === 'text' ? `Texte : ${item.text}` : 'Signature');
    el.onfocus = () => { if (selected !== item.id) { selected = item.id; updateSelection(); } };
    el.onpointerdown = (event) => startDrag(event,item,el,event.target === handle);
    el.onkeydown = (e) => { if(e.target.closest('[contenteditable="plaintext-only"]'))return;if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(e.key)) return; e.preventDefault(); if (e.key === 'Delete' || e.key === 'Backspace') return removeSelected(); const step = e.shiftKey ? .02 : .003; item.x = clamp(item.x + (e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),0,1-item.w); item.y=clamp(item.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0),0,1-item.h); el.style.left=`${item.x*100}%`; el.style.top=`${item.y*100}%`; };
    $('overlays').append(el);
  }
}
function updateSelection() { for (const el of $('overlays').children) el.classList.toggle('selected',el.dataset.id===selected); updateProperties(); }
function discardEmptyText(keepSelected = false) {
  const count=items.length;
  items=items.filter(item=>item.type!=='text'||item.text.trim()||(keepSelected&&item.id===selected));
  if(!items.some(item=>item.id===selected))selected=null;
  if(items.length!==count)renderItems();
}
function updateProperties() { discardEmptyText(true);const item=items.find(item=>item.id===selected);selectionTools.hidden=!item;editButton.hidden=!item;signatureTools.hidden=!item||item.type!=='signature';if(!item){editingId=null;}else{editButton.textContent=item.type==='text'?'✎ Écrire':'Changer l’image';const source=signatureSources.get(item.data);if(item.type==='signature'){signatureTools.hidden=!source;if(source){$('clean-signature').checked=source.clean;$('clean-strength').value=source.strength;$('clean-strength').disabled=!source.clean;}}}for(const el of $('overlays').children){const text=el.querySelector('.text-content');if(text)text.contentEditable=el.dataset.id===editingId?'plaintext-only':'false';}scheduleElementCenter(); }
function startDrag(e,item,el,resize) {
  if(!resize&&e.target.closest('[contenteditable="plaintext-only"]'))return;
  if (e.button !== 0 || pinch) return; e.preventDefault(); checkpoint();editingId=null;document.activeElement.blur();selected=item.id; updateSelection(); el.setPointerCapture(e.pointerId);
  const rect=$('page-stage').getBoundingClientRect(), sx=e.clientX,sy=e.clientY, initial={...item};
  el.onpointermove = (ev) => {
    if(pinch)return;
    const dx=(ev.clientX-sx)/rect.width, dy=(ev.clientY-sy)/rect.height;
    if (resize) { const factor=clamp(Math.max((initial.w+dx)/initial.w,(initial.h+dy)/initial.h),.2,Math.min((1-item.x)/initial.w,(1-item.y)/initial.h)); item.w=initial.w*factor;item.h=initial.h*factor;item.size=initial.size*factor; }
    else { item.x=clamp(initial.x+dx,0,1-item.w);item.y=clamp(initial.y+dy,0,1-item.h); }
    Object.assign(el.style,{left:`${item.x*100}%`,top:`${item.y*100}%`,width:`${item.w*100}%`,height:`${item.h*100}%`,fontSize:`${item.size*rect.width}px`});
  };
  el.onpointerup=el.onpointercancel=()=>{el.onpointermove=null;updateProperties();};
}
function addItem(item) { checkpoint();const stage=$('page-stage').getBoundingClientRect(),scroll=$('page-scroll').getBoundingClientRect();const centerY=(scroll.top+Math.min(scroll.height*.4,250)-stage.top)/stage.height;const centerX=(scroll.left+$('page-scroll').clientWidth/2-stage.left)/stage.width;const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');items.push({...item,id,page:pageNumber,x:clamp(centerX-item.w/2,0,1-item.w),y:clamp(centerY,0,1-item.h)}); selected=items.at(-1).id;renderItems();updateProperties(); }
function measureText(item) { const g=geometries[item.page];const c=document.createElement('canvas').getContext('2d');c.font=`${item.size*g.width}px ${fontFamilies[item.font||'Helvetica']}`;item.w=Math.min(.88,Math.max(.12,...item.text.split('\n').map(line=>c.measureText(line).width/g.width+.006)));item.h=Math.min(.8,Math.max(item.size*g.width/g.height*(item.lineHeight||1.2)*item.text.split('\n').length,.025));item.x=clamp(item.x,0,1-item.w);item.y=clamp(item.y,0,1-item.h); }
function removeSelected(){checkpoint();items=items.filter(x=>x.id!==selected);selected=null;renderItems();updateProperties();}
$('open-pdf').onclick=()=>$('pdf-input').click();$('pdf-input').onchange=async(e)=>{await readFile(e.target.files[0]);e.target.value='';};
$('new-document').onclick=()=>{if(items.length&&!window.confirm('Ouvrir un autre PDF effacera les modifications de ce document. Avez-vous téléchargé votre PDF rempli ?'))return;documentMenu.close();$('pdf-input').click();};
$('dropzone').ondragover=(e)=>{e.preventDefault();$('dropzone').classList.add('drag-over');};$('dropzone').ondragleave=()=>$('dropzone').classList.remove('drag-over');$('dropzone').ondrop=(e)=>{e.preventDefault();$('dropzone').classList.remove('drag-over');readFile(e.dataTransfer.files[0]);};
$('add-text').onclick=()=>{const item={type:'text',text:'',size:Math.max(.022,16/$('page-stage').clientWidth),w:.25,h:.04};addItem(item);editingId=selected;updateProperties();measureText(items.at(-1));renderItems();focusInlineText();};
$('add-signature').onclick=()=>{if(signatureData){placeSignature(signatureData,signatureRatio);}else signatureImporter.open();};
// Long press is unnecessary: the properties panel also lets you replace a PNG.
function placeSignature(data,ratio){const g=geometries[pageNumber];const w=Math.min(.3,.3*g.height/g.width*ratio);addItem({type:'signature',data,w,h:w*g.width/g.height/ratio,size:.02});}
const signatureImporter=setupInlineSignatureImport({input:$('signature-input'),onError:notify,onConfirm:({data,ratio,signature,replacementId})=>{
  signatureSources.set(data,signature);
  signatureData=data;signatureRatio=ratio;
  const existing=items.find(item=>item.id===replacementId&&item.type==='signature');
  if(existing){checkpoint();const g=geometries[existing.page];existing.data=data;existing.h=Math.min(1-existing.y,existing.w*g.width/g.height/ratio);existing.w=existing.h*g.height/g.width*ratio;editingId=null;renderItems();updateProperties();}
  else placeSignature(data,ratio);
}});
for(const id of ['clean-signature','clean-strength'])$(id).onchange=()=>{const item=items.find(item=>item.id===selected);const source=item&&signatureSources.get(item.data);if(!source)return;const next={...source,clean:$('clean-signature').checked,strength:Number($('clean-strength').value)};try{const result=renderSignature(next);checkpoint();signatureSources.set(result.data,next);item.data=result.data;const g=geometries[item.page];item.h=Math.min(1-item.y,item.w*g.width/g.height/result.ratio);item.w=item.h*g.height/g.width*result.ratio;signatureData=result.data;signatureRatio=result.ratio;renderItems();updateProperties();}catch{notify('Aucun trait visible. Diminuez le nettoyage.');updateProperties();}};
document.addEventListener('pointerdown',(e)=>{
  if(e.target.closest('.selection-tools')||e.target.closest('.inline-signature-tools')||e.target.closest('[contenteditable="plaintext-only"]'))return;
  editingId=null;
  const placed=e.target.closest('.placed');
  if(placed&&placed.dataset.id===selected)return;
  discardEmptyText();updateProperties();
},true);
$('overlays').onpointerdown=(e)=>{if(e.target===$('overlays')){selected=null;updateSelection();}};
$('prev').onclick=()=>{if(pageNumber>1)goToPage(pageNumber-1);};$('next').onclick=()=>{if(pageNumber<pdf.numPages)goToPage(pageNumber+1);};
$('export').onclick=async()=>{const button=$('export');button.disabled=true;try{const result=await exportPdf(bytes,items,geometries);const blob=new Blob([result],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename.replace(/\.pdf$/i,'')+'-signe.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('Votre PDF est prêt. Sur iPhone, utilisez Partager pour l’enregistrer dans Fichiers.');}catch(err){console.error(err);notify('Export impossible. Les textes doivent utiliser des caractères latins (sans emoji).');}finally{button.disabled=false;}};
$('demo').onclick=async()=>{const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);const page=doc.addPage([595,842]);const ink=rgb(.12,.2,.18);page.drawText('AUTORISATION',{x:55,y:755,size:24,font,color:ink});page.drawText('Un exemple pour prendre la main',{x:55,y:724,size:12,font,color:ink});for(const [i,text]of ['Je soussigné(e) :','Autorise :','Fait à :                         Le :','Signature :'].entries()){const y=620-i*110;page.drawText(text,{x:55,y,size:13,font,color:ink});page.drawLine({start:{x:55,y:y-45},end:{x:540,y:y-45},thickness:.6,color:rgb(.7,.75,.72)});}await openDocument(await doc.save(),'Autorisation-demo.pdf');};
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderPage,150);});
window.addEventListener('beforeunload',(e)=>{if(items.length){e.preventDefault();e.returnValue='';}});
