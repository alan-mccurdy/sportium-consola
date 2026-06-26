/* ===== Capa de datos del CRM (local). Nada sale de la PC. Separado de la base ficticia CLIENTES. ===== */
var crmStore = [];
var CRM_CANON = ['usuario','cedula','correo','nombre','pais','kyc_estado','documentos_estado','retiro_estado','retiro_monto','bono_estado','deposito_estado'];

function crmStatus(){ var s=document.getElementById('crmStatus'); if(s)s.textContent = crmStore.length ? (crmStore.length+' clientes en memoria local.') : 'Sin datos cargados.'; }
function crmLoadStore(){ try{ crmStore = JSON.parse(localStorage.getItem('crm-store')||'[]'); }catch(e){ crmStore=[]; } crmStatus(); }
function crmSaveStore(){ try{ localStorage.setItem('crm-store', JSON.stringify(crmStore)); }catch(e){} }
function crmClear(){ crmStore=[]; try{ localStorage.removeItem('crm-store'); }catch(e){} crmStatus(); var r=document.getElementById('crmResultados'); if(r)r.innerHTML=''; }

function openCrm(){ if(typeof isAdmin==='function' && !isAdmin())return; document.getElementById('crmOverlay').classList.add('on'); document.getElementById('crmPanel').classList.add('on'); crmStatus(); }
function closeCrm(){ document.getElementById('crmOverlay').classList.remove('on'); document.getElementById('crmPanel').classList.remove('on'); }

function crmReadFile(file, cb){
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var wb=XLSX.read(e.target.result, {type:'array'});
      var ws=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(ws, {defval:''});
      cb(rows);
    }catch(err){ if(typeof toast==='function')toast('No se pudo leer el Excel'); }
  };
  reader.readAsArrayBuffer(file);   // se procesa en el navegador; NO hay subida
}

function crmSavedMap(sourceLabel){ try{ return JSON.parse(localStorage.getItem('crm-map-'+sourceLabel)||'{}'); }catch(e){ return {}; } }

function crmEsc(h){ return String(h==null?'':h).replace(/[&<>"]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }

function crmRenderMapping(headers, sourceLabel){
  var saved=crmSavedMap(sourceLabel);
  var box=document.getElementById('crmMapBox');
  var opts=function(sel){ return '<option value="">— ignorar —</option>'+headers.map(function(h){ return '<option value="'+crmEsc(h)+'"'+(sel===h?' selected':'')+'>'+crmEsc(h)+'</option>'; }).join(''); };
  box.innerHTML='<div class="fld">Mapeo de columnas ('+crmEsc(sourceLabel)+')</div>'+
    CRM_CANON.map(function(c){ return '<div style="display:flex;gap:6px;align-items:center;margin:2px 0"><span style="min-width:150px;font-size:12px">'+c+'</span><select data-canon="'+c+'">'+opts(saved[c]||'')+'</select></div>'; }).join('')+
    '<button class="btn" onclick="crmAplicarMapeo(\''+sourceLabel+'\')" style="margin-top:6px">Aplicar e importar</button>';
}

function crmOnFile(input, sourceLabel){
  var file=input.files && input.files[0]; if(!file) return;
  crmReadFile(file, function(rows){
    var headers=CRM.detectHeaders(rows);
    crmRenderMapping(headers, sourceLabel);
    var box=document.getElementById('crmMapBox');
    box._rows=rows; box._src=sourceLabel;
  });
  input.value='';   // permite recargar el mismo archivo
}

function crmAplicarMapeo(sourceLabel){
  var box=document.getElementById('crmMapBox'); var rows=(box && box._rows)||[];
  var mapping={};
  box.querySelectorAll('select[data-canon]').forEach(function(sel){ if(sel.value) mapping[sel.getAttribute('data-canon')]=sel.value; });
  try{ localStorage.setItem('crm-map-'+sourceLabel, JSON.stringify(mapping)); }catch(e){}
  var recs=CRM.applyMapping(rows, mapping);
  crmStore=CRM.mergeRecords(crmStore, recs, sourceLabel);
  crmSaveStore(); crmStatus();
  box.innerHTML='';
  if(typeof toast==='function')toast(recs.length+' filas importadas ('+sourceLabel+')');
}

function crmBuscar(text){
  var res=document.getElementById('crmResultados'); if(!res) return;
  if(!text){ res.innerHTML=''; return; }
  var hits=CRM.searchStore(crmStore, text).slice(0,8);
  res.innerHTML = hits.length ? hits.map(function(c){
    var f=c.fields||{}; var k=c.keys||{};
    return '<div class="file"><span class="nm">'+crmEsc(f.nombre||k.usuario||k.correo||'(cliente)')+'</span><span style="color:var(--txt-2)">'+
      crmEsc('usuario:'+(k.usuario||'—')+'  KYC:'+(f.kyc_estado||'—')+'  retiro:'+(f.retiro_estado||'—'))+'</span></div>';
  }).join('') : '<div class="hint">Sin coincidencias.</div>';
}

document.addEventListener('DOMContentLoaded', function(){
  var fc=document.getElementById('crmFileClientes'); if(fc) fc.addEventListener('change', function(){ crmOnFile(this, 'clientes'); });
  var ft=document.getElementById('crmFileTrans'); if(ft) ft.addEventListener('change', function(){ crmOnFile(this, 'transacciones'); });
  crmLoadStore();
});
