
import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import{SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}from'./config.js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const st={user:null,year:null,classes:[],sports:[],sportCounts:{},lessons:[],modules:[],tests:[],exceptions:[],hof:[],month:new Date(),currentSport:null,currentExercises:[],categories:[],primaryDefaults:[],primaryCustom:[],primaryGames:[]};
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=d=>new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00'));
const iconMap={'pallacanestro':'🏀','ultimate-frisbee':'🥏','pallamano':'🤾','pallavolo':'🏐','badminton':'🏸','tennis':'🎾','calcio-a-5':'⚽','atletica-leggera':'🏃','rugby':'🏉','orienteering':'🧭','giochi-tradizionali':'🪁','baseball':'⚾','judo':'🥋','giocoleria':'🎪','fitness':'🏋️'};
const phaseLabel={activation:'ATTIVAZIONE',main:'PARTE CENTRALE',final:'APPLICAZIONE FINALE',closing:'CHIUSURA',warmup:'ATTIVAZIONE',technical:'TECNICA',tactical:'PARTE CENTRALE',game:'PARTITA / SSG',assessment:'VALUTAZIONE',cooldown:'CHIUSURA'};

const schoolLevelLabels={primary:'Scuola primaria',lower_secondary:'Secondaria di primo grado',upper_secondary:'Secondaria di secondo grado'};
const schoolGradeOptions={primary:[['1','Prima primaria'],['2','Seconda primaria'],['3','Terza primaria'],['4','Quarta primaria'],['5','Quinta primaria']],lower_secondary:[['1','Prima media'],['2','Seconda media'],['3','Terza media']],upper_secondary:[['1','Prima superiore'],['2','Seconda superiore'],['3','Terza superiore'],['4','Quarta superiore'],['5','Quinta superiore']]};
let classOriginalStudentIds=[];
function currentSchoolYearDefaults(){const now=new Date(),startYear=now.getMonth()>=6?now.getFullYear():now.getFullYear()-1;return{label:`${startYear}/${startYear+1}`,start:`${startYear}-09-01`,end:`${startYear+1}-06-30`}}
function openSchoolYearDialog(initial=!st.year){const d=currentSchoolYearDefaults();$('#migrateModalTitle').textContent=initial?'Crea il primo anno scolastico':'Crea nuovo anno scolastico';$('#promoteClassesWrap').classList.toggle('hidden',initial);$('#migrateSubmitBtn').textContent=initial?'Crea anno scolastico':'Crea nuovo anno scolastico';const yes=document.querySelector('input[name=\"promoteClasses\"][value=\"yes\"]');if(yes)yes.checked=true;if(initial||!$('#newYearLabel').value){$('#newYearLabel').value=d.label;$('#newYearStart').value=d.start;$('#newYearEnd').value=d.end}$('#migrateModal').showModal()}
function requireSchoolYear(message='Prima devi creare un anno scolastico.'){if(st.year)return true;toast(message);openSchoolYearDialog(true);return false}
function updateGradeOptions(selected=''){const level=$('#classSchoolLevel').value,opts=schoolGradeOptions[level]||[];$('#classGrade').innerHTML=opts.length?opts.map(([v,l])=>`<option value="${v}" ${String(selected)===v?'selected':''}>${l}</option>`).join(''):'<option value="">Seleziona prima il grado scolastico</option>';$('#schoolLevelHelp').textContent=level?`Percorso: ${schoolLevelLabels[level]}. Potrai cambiare questa impostazione anche in seguito.`:'Seleziona prima il grado scolastico.'}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2300)}
function openMobileMenu(){const m=$('#mobileMenu'),b=$('#mobileMenuBackdrop');if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');b?.classList.remove('hidden');$('#mobileMenuBtn')?.setAttribute('aria-expanded','true');document.body.classList.add('menu-open')}
function closeMobileMenu(){const m=$('#mobileMenu'),b=$('#mobileMenuBackdrop');if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true');b?.classList.add('hidden');$('#mobileMenuBtn')?.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open')}
function go(v){closeMobileMenu();$$('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));let m={dashboard:['PANORAMICA','Dashboard'],calendar:['ANNO SCOLASTICO','Calendario'],classes:['GESTIONE','Classi'],planner:['MOTORE DIDATTICO','Programmazione'],sports:['MEGA ARCHIVIO','Archivio sport'],tests:['VALUTAZIONE','Test motori'],primarygames:['SCUOLA PRIMARIA','Giochi scuola primaria'],settings:['CONFIGURAZIONE','Impostazioni']}[v];$('#pageKicker').textContent=m[0];$('#pageTitle').textContent=m[1];if(v==='sports')renderSports();if(v==='primarygames')loadPrimaryGames();if(v==='tests')renderTests();if(v==='calendar')renderCalendar();if(v==='settings')renderSettings()}
$$('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));$$('[data-jump]').forEach(b=>b.onclick=()=>go(b.dataset.jump));$('#quickPlan').onclick=()=>go('planner');$$('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$('#mobileMenuBtn').onclick=openMobileMenu;$('#mobileMoreBtn').onclick=openMobileMenu;$('#mobileMenuClose').onclick=closeMobileMenu;$('#mobileMenuBackdrop').onclick=closeMobileMenu;$('#mobileLogoutBtn').onclick=()=>db.auth.signOut();document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileMenu()});

async function loadCore(){
  const results=await Promise.all([
    db.from('pe_school_years').select('*').eq('is_active',true).maybeSingle(),
    db.from('pe_classes').select('*').eq('archived',false).order('school_level').order('grade').order('name'),
    db.from('pe_sports').select('*').eq('active',true).order('name'),
    db.from('pe_lessons').select('*,pe_classes(name),pe_sports(name)').order('lesson_date').limit(200),
    db.from('pe_sport_modules').select('*,pe_classes(name),pe_sports(name)').order('start_date',{ascending:false}).limit(100),
    db.from('pe_motor_tests').select('*').eq('active',true).order('name'),
    db.from('pe_calendar_exceptions').select('*').order('exception_date'),
    db.from('pe_motor_test_hall_of_fame').select('*').limit(40)
  ]);
  const firstError=results.find(r=>r.error)?.error;if(firstError)throw firstError;
  const [y,c,s,l,m,t,e,h]=results;
  st.year=y.data||null;st.classes=c.data||[];st.sports=s.data||[];st.lessons=l.data||[];st.modules=m.data||[];st.tests=t.data||[];st.exceptions=e.data||[];st.hof=h.data||[];
  const counts=await Promise.all(st.sports.map(async sp=>{const{count,error}=await db.from('pe_exercises').select('*',{count:'exact',head:true}).eq('sport_id',sp.id).eq('active',true).eq('audit_status','VERIFIED');if(error)throw error;return[sp.id,count||0]}));
  st.sportCounts=Object.fromEntries(counts);populateSelects();renderDashboard();renderClasses();renderModules();renderTests();renderSettings();
}

function populateSelects(){
  const co='<option value="">Seleziona classe</option>'+st.classes.map(c=>`<option value="${c.id}">${esc(c.name)} · ${c.student_count} alunni</option>`).join('');
  ['planClass','sessionClass','rankingClass','exceptionClass'].forEach(id=>$( '#'+id).innerHTML=co);
  const so='<option value="">Seleziona sport</option>'+st.sports.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('#planSport').innerHTML=so;
  const to='<option value="">Seleziona test</option>'+st.tests.map(t=>`<option value="${t.id}">${esc(t.name)} (${esc(t.unit)})</option>`).join('');
  $('#sessionTest').innerHTML=to;$('#hofTest').innerHTML='<option value="">Tutti i test</option>'+st.tests.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
  if(!$('#planStart').value)$('#planStart').value=new Date().toISOString().slice(0,10);
  if(!$('#sessionDate').value)$('#sessionDate').value=new Date().toISOString().slice(0,10);
}
function listItem(a,b,c=''){return`<div class="list-item"><div><strong>${esc(a)}</strong><small>${esc(b)}</small></div>${c}</div>`}
function renderDashboard(){
  $('#statClasses').textContent=st.classes.length;$('#statSports').textContent=st.sports.length+1;$('#statLessons').textContent=st.lessons.length;$('#statTests').textContent=st.tests.length;
  $('#heroExerciseCount').textContent=Object.values(st.sportCounts).reduce((a,b)=>a+b,0)||1390;
  const today=new Date().toISOString().slice(0,10),u=st.lessons.filter(x=>x.lesson_date>=today).slice(0,6);
  $('#upcomingLessons').innerHTML=u.map(x=>`<div class="list-item" data-lesson="${x.id}"><div><strong>${esc(x.title)}</strong><small>${esc(x.pe_classes?.name||'')} · ${fmt(x.lesson_date)}</small></div><span class="chip good">${x.duration_min}'</span></div>`).join('')||listItem('Nessuna lezione futura','Programma il primo modulo');
  $$('[data-lesson]').forEach(b=>b.onclick=()=>openLesson(b.dataset.lesson));
  $('#dashboardHof').innerHTML=st.hof.slice(0,6).map(x=>listItem(`${x.first_name} ${x.last_name}`,`${x.test_name} · ${x.school_year_label}`,`<span class="chip gold">${x.result_value} ${esc(x.unit)}</span>`)).join('')||listItem('Nessun record ancora','Inserisci i primi risultati');
}
function renderClasses(){
  $('#classesGrid').innerHTML=st.classes.map(c=>`<article class="class-card" data-class="${c.id}">${c.school_level?`<span class="class-school-badge">${esc(schoolLevelLabels[c.school_level]||c.school_level)}</span>`:'<span class="class-school-badge">Grado scolastico da impostare</span>'}<span class="kicker">CLASSE</span><h4>${esc(c.name)}</h4><div class="class-counts"><span class="chip">${c.student_count} alunni</span><span class="chip">♀ ${c.female_count??'—'}</span><span class="chip">♂ ${c.male_count??'—'}</span></div><div class="edit-hint">Apri e modifica →</div></article>`).join('')||`<article class="class-card"><h4>Nessuna classe</h4><p>Creane una per iniziare.</p></article>`;
  $$('[data-class]').forEach(x=>x.onclick=()=>openClass(x.dataset.class));
}
$('#newClassBtn').onclick=()=>openClass(null);
async function openClass(id){
  if(!id&&!requireSchoolYear('Per creare una classe devi prima impostare l’anno scolastico.'))return;
  $('#classId').value=id||'';$('#studentRows').innerHTML='';$('#classMsg').textContent='';classOriginalStudentIds=[];
  $('#deleteClassBtn').classList.toggle('hidden',!id);
  if(id){
    const c=st.classes.find(x=>x.id===id);if(!c)return toast('Classe non trovata');$('#classModalTitle').textContent=c.name;$('#className').value=c.name;$('#classSchoolLevel').value=c.school_level||'';updateGradeOptions(c.grade);$('#femaleCount').value=c.female_count??0;$('#maleCount').value=c.male_count??0;
    const{data:en,error}=await db.from('pe_student_enrollments').select('*,pe_students(*)').eq('class_id',id).eq('active',true);if(error)return toast(error.message);
    classOriginalStudentIds=(en||[]).map(x=>x.student_id);(en||[]).forEach(x=>addStudentRow(x.pe_students?.first_name,x.pe_students?.last_name,x.pe_students?.sex,x.pe_students?.id));
  }else{$('#classModalTitle').textContent='Nuova classe';$('#className').value='';$('#classSchoolLevel').value='';updateGradeOptions('');$('#femaleCount').value=0;$('#maleCount').value=0}
  await renderLevelGrid(id);$('#classModal').showModal();
}
function addStudentRow(first='',last='',sex='F',id=''){let d=document.createElement('div');d.className='student-row';d.dataset.studentId=id;d.innerHTML=`<input class="s-first" placeholder="Nome" value="${esc(first)}"><input class="s-last" placeholder="Cognome" value="${esc(last)}"><select class="s-sex"><option value="F" ${sex==='F'?'selected':''}>F</option><option value="M" ${sex==='M'?'selected':''}>M</option></select><button type="button">×</button>`;d.querySelector('button').onclick=()=>d.remove();$('#studentRows').appendChild(d)}
$('#addStudentRow').onclick=()=>addStudentRow();
async function renderLevelGrid(classId){
  let levels={};if(classId){const{data,error}=await db.from('pe_class_sport_levels').select('*').eq('class_id',classId);if(error)throw error;(data||[]).forEach(x=>levels[x.sport_id]=x.level)}
  $('#sportLevelGrid').innerHTML=st.sports.map(s=>`<div class="level-item"><span>${iconMap[s.slug]||'●'} ${esc(s.name)}</span><select data-sport-level="${s.id}"><option value="">Non impostato</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${levels[s.id]==n?'selected':''}>${n} · ${['','Principiante','Base','Intermedio','Avanzato','Molto avanzato'][n]}</option>`).join('')}</select></div>`).join('');
}
$('#classSchoolLevel').onchange=()=>updateGradeOptions('');

$('#deleteClassBtn').onclick=async()=>{
  const id=$('#classId').value;if(!id)return;
  const c=st.classes.find(x=>x.id===id);if(!c)return;
  if(!confirm(`Eliminare la classe “${c.name}” dall'anno scolastico corrente?\n\nLa classe verrà archiviata: non comparirà più nell'app, ma lo storico rimarrà conservato.`))return;
  const btn=$('#deleteClassBtn'),msg=$('#classMsg');btn.disabled=true;msg.textContent='Archivio la classe…';
  try{
    const{error:enErr}=await db.from('pe_student_enrollments').update({active:false,updated_at:new Date().toISOString()}).eq('class_id',id);if(enErr)throw enErr;
    const{error}=await db.from('pe_classes').update({archived:true,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    $('#classModal').close();await loadCore();toast('Classe eliminata dall’anno corrente');
  }catch(err){console.error(err);msg.textContent='Errore eliminazione: '+(err.message||'operazione non riuscita');toast('Impossibile eliminare la classe')}
  finally{btn.disabled=false}
};
$('#classForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget,saveBtn=$('#classSaveBtn'),msg=$('#classMsg');
  if(!requireSchoolYear('Manca l’anno scolastico: crealo prima di salvare la classe.')){msg.textContent='Crea prima l’anno scolastico.';return}
  const id=$('#classId').value||null,name=$('#className').value.trim(),level=$('#classSchoolLevel').value,grade=Number($('#classGrade').value),f=Number($('#femaleCount').value),m=Number($('#maleCount').value),total=f+m;
  if(!name||!level||!Number.isInteger(grade)){msg.textContent='Completa nome, grado scolastico e classe/anno.';return}
  if(f<0||m<0||!Number.isFinite(total)){msg.textContent='Controlla il numero di alunni.';return}
  saveBtn.disabled=true;saveBtn.textContent='Salvataggio…';msg.textContent='Salvataggio della classe…';
  try{
    let cid=id;
    const classPayload={name,school_level:level,grade,female_count:f,male_count:m,student_count:total,updated_at:new Date().toISOString()};
    if(id){const{error}=await db.from('pe_classes').update(classPayload).eq('id',id);if(error)throw error}
    else{const{data,error}=await db.from('pe_classes').insert({owner_id:st.user.id,school_year_id:st.year.id,...classPayload}).select().single();if(error)throw error;cid=data.id}

    msg.textContent='Sincronizzo gli alunni…';
    const rows=$$('.student-row');const keptIds=[];const newStudents=[];
    for(const row of rows){const sid=row.dataset.studentId,first=row.querySelector('.s-first').value.trim(),last=row.querySelector('.s-last').value.trim(),sex=row.querySelector('.s-sex').value;if(!first&&!last)continue;if(!first||!last)throw new Error('Completa nome e cognome di ogni alunno oppure lascia entrambe le caselle vuote.');if(sid){const{error}=await db.from('pe_students').update({first_name:first,last_name:last,sex,updated_at:new Date().toISOString()}).eq('id',sid);if(error)throw error;keptIds.push(sid)}else newStudents.push({owner_id:st.user.id,first_name:first,last_name:last,sex})}
    if(newStudents.length){const{data,error}=await db.from('pe_students').insert(newStudents).select('id');if(error)throw error;const enrollments=(data||[]).map(x=>({owner_id:st.user.id,student_id:x.id,class_id:cid,school_year_id:st.year.id,active:true}));if(enrollments.length){const{error:enErr}=await db.from('pe_student_enrollments').insert(enrollments);if(enErr)throw enErr}}
    const removed=classOriginalStudentIds.filter(sid=>!keptIds.includes(sid));if(id&&removed.length){const{error}=await db.from('pe_student_enrollments').update({active:false,updated_at:new Date().toISOString()}).eq('class_id',cid).in('student_id',removed);if(error)throw error}

    msg.textContent='Salvo i livelli sportivi…';
    const levelRows=$$('[data-sport-level]').filter(x=>x.value).map(sel=>({owner_id:st.user.id,class_id:cid,sport_id:sel.dataset.sportLevel,level:Number(sel.value)}));
    // Sincronizzazione volutamente semplice: niente UPSERT. Su Safari/iOS questa strada è più robusta
    // e rispecchia il significato dei livelli, che sono impostazioni correnti della classe.
    const{error:clearLevelsErr}=await db.from('pe_class_sport_levels').delete().eq('class_id',cid);if(clearLevelsErr)throw clearLevelsErr;
    if(levelRows.length){const{error:insertLevelsErr}=await db.from('pe_class_sport_levels').insert(levelRows);if(insertLevelsErr)throw insertLevelsErr}

    msg.textContent='Aggiorno l’app…';await loadCore();$('#classModal').close();toast('Classe salvata e sincronizzata');
  }catch(err){console.error(err);msg.textContent='Errore: '+(err.message||'salvataggio non riuscito');toast('Salvataggio non riuscito')}
  finally{saveBtn.disabled=false;saveBtn.textContent='Salva classe'}
}

function renderModules(){$('#moduleList').innerHTML=st.modules.slice(0,18).map(x=>listItem(x.title,`${x.pe_classes?.name||''} · ${x.planned_weeks} settimane`, `<span class="chip">${x.status}</span>`)).join('')||listItem('Nessun modulo','Creane uno dal generatore')}
$('#plannerForm').onsubmit=async e=>{e.preventDefault();const cid=$('#planClass').value,sid=$('#planSport').value;if(!cid||!sid)return;const sp=st.sports.find(x=>x.id===sid),cl=st.classes.find(x=>x.id===cid);$('#plannerMsg').textContent='Genero la progressione…';let{data:m,error}=await db.from('pe_sport_modules').insert({owner_id:st.user.id,class_id:cid,sport_id:sid,module_type:'automatic',title:`${sp.name} · ${cl.name}`,start_date:$('#planStart').value,planned_weeks:+$('#planWeeks').value,lesson_duration_min:+$('#planMinutes').value,level_override:$('#planLevel').value?+$('#planLevel').value:null,progression_mode:'progressive',status:'planned'}).select().single();if(error)return $('#plannerMsg').textContent=error.message;let{error:er}=await db.rpc('pe_generate_module_plan',{p_module_id:m.id,p_regenerate:false});if(er)return $('#plannerMsg').textContent=er.message;$('#plannerMsg').textContent='Programmazione generata.';toast('Modulo generato');await loadCore()}
let replaceCtx=null;
function primaryMarker(ref=''){const m=String(ref||'').match(/PRIMARY_GAME:(BOOK:(\d+)|CUSTOM:([0-9a-f-]+))/i);if(!m)return null;return m[2]?`book-${m[2]}`:m[3]}
async function openLesson(id){let{data:l}=await db.from('pe_lessons').select('*,pe_classes(name),pe_sports(id,name)').eq('id',id).single(),{data:it}=await db.from('pe_lesson_exercises').select('*,pe_exercises(*)').eq('lesson_id',id).order('order_no');$('#lessonModalTitle').textContent=l.title;$('#lessonBody').innerHTML=`<div class="category-pills"><span class="chip">${esc(l.pe_classes?.name)}</span><span class="chip">${fmt(l.lesson_date)}</span><span class="chip">${l.duration_min}'</span></div><div class="lesson-timeline">${(it||[]).map(x=>{const pm=primaryMarker(x.primary_game_ref);return`<div class="lesson-row"><div class="lesson-time">${x.duration_min}'</div><div><span class="kicker">${phaseLabel[x.phase]||x.phase}</span><strong>${esc(x.custom_title||x.pe_exercises?.name||'Attività')}</strong><p>${esc(x.custom_explanation||x.pe_exercises?.student_explanation||'')}</p>${x.station_count?`<div class="category-pills"><span class="chip">${x.station_count} campi/stazioni</span><span class="chip">${x.players_per_group} alunni/gruppo</span></div>`:''}</div><div class="lesson-actions">${x.exercise_id?`<button class="btn secondary small-btn" data-open-ex="${x.exercise_id}">Dettagli</button>`:pm?`<button class="btn secondary small-btn" data-open-primary="${pm}">Dettagli</button>`:''}<button class="btn primary small-btn" data-replace-item="${x.id}">Cambia</button></div></div>`}).join('')}</div>`;$$('[data-open-ex]').forEach(b=>b.onclick=()=>openExercise(b.dataset.openEx));$$('[data-open-primary]').forEach(b=>b.onclick=async()=>{await loadPrimaryGames();openPrimaryGame(b.dataset.openPrimary)});$$('[data-replace-item]').forEach(b=>b.onclick=()=>startReplacement(b.dataset.replaceItem,l,it||[]));$('#lessonModal').showModal()}
async function startReplacement(itemId,lesson,items){const item=items.find(x=>x.id===itemId);if(!item)return;replaceCtx={item,lesson};$('#replaceModeModal').showModal()}
$('#replaceSameSport').onclick=async()=>{if(!replaceCtx)return;$('#replaceModeModal').close();const pm=primaryMarker(replaceCtx.item.primary_game_ref);if(pm){await showPrimaryReplacementPicker();return}const sid=replaceCtx.item.pe_exercises?.sport_id||replaceCtx.lesson.pe_sports?.id;if(sid)await showExerciseReplacementPicker(sid)};
$('#replaceFree').onclick=()=>{$('#replaceModeModal').close();showReplacementSports()};
function showReplacementSports(){const primaryCount=(st.primaryDefaults?.length||75)+(st.primaryCustom?.length||0);$('#replacePickerTitle').textContent='Scegli la disciplina';$('#replacePickerBody').innerHTML=`<div class="replace-picker-sports">${st.sports.map(s=>`<button class="replace-picker-sport" data-replace-sport="${s.id}"><span>${iconMap[s.slug]||'🏅'}</span><b>${esc(s.name)}</b><span>${st.sportCounts[s.id]||0} attività verificate</span></button>`).join('')}<button class="replace-picker-sport primary-sport-card" data-replace-primary="1"><span>✹</span><b>Giochi Scuola Primaria</b><span>${primaryCount} giochi</span></button></div>`;$$('[data-replace-sport]').forEach(b=>b.onclick=()=>showExerciseReplacementPicker(b.dataset.replaceSport));$('[data-replace-primary]').onclick=()=>showPrimaryReplacementPicker();$('#replacePickerModal').showModal()}
async function showExerciseReplacementPicker(sportId){const sp=st.sports.find(x=>x.id===sportId);$('#replacePickerTitle').textContent=sp?.name||'Attività';$('#replacePickerBody').innerHTML='<p class="muted">Caricamento attività…</p>';$('#replacePickerModal').showModal();let{data,error}=await db.from('pe_exercises').select('id,name,student_explanation,difficulty,duration_min,duration_max').eq('sport_id',sportId).eq('active',true).eq('audit_status','VERIFIED').order('name').limit(500);if(error){toast(error.message);return}$('#replacePickerBody').innerHTML=`<div class="replace-exercise-grid">${(data||[]).map(e=>`<article class="replace-exercise-card"><h4>${esc(e.name)}</h4><p>${esc(e.student_explanation||'')}</p><div class="category-pills"><span class="chip">Liv. ${e.difficulty||'—'}</span><span class="chip">${e.duration_min||'—'}–${e.duration_max||'—'}'</span></div><button class="btn primary small-btn" data-choose-exercise="${e.id}">Scegli</button></article>`).join('')}</div>`;$$('[data-choose-exercise]').forEach(b=>b.onclick=()=>applyExerciseReplacement(b.dataset.chooseExercise))}
async function showPrimaryReplacementPicker(){await loadPrimaryGames();$('#replacePickerTitle').textContent='Giochi Scuola Primaria';$('#replacePickerBody').innerHTML=`<div class="replace-exercise-grid">${st.primaryGames.map(g=>`<article class="replace-exercise-card"><img class="replace-primary-thumb" src="${esc(g._imageUrl||('./'+g.image_path))}" alt=""><h4>${esc(g.title)}</h4><p>${esc(g.description||'')}</p><div class="category-pills"><span class="chip">Difficoltà ${g.difficulty}/5</span></div><button class="btn primary small-btn" data-choose-primary="${esc(g.id)}">Scegli</button></article>`).join('')}</div>`;$$('[data-choose-primary]').forEach(b=>b.onclick=()=>applyPrimaryReplacement(b.dataset.choosePrimary));$('#replacePickerModal').showModal()}
async function applyExerciseReplacement(newId){if(!replaceCtx)return;const old=replaceCtx.item.exercise_id||null;const{error}=await db.from('pe_lesson_exercises').update({exercise_id:newId,custom_title:null,custom_explanation:null,custom_field_dimensions:null,custom_equipment:null,primary_game_ref:null,replaced_from_exercise_id:old,replaced_at:new Date().toISOString(),replacement_reason:'manual_change'}).eq('id',replaceCtx.item.id);if(error)return toast(error.message);await db.from('pe_lesson_exercise_replacements').insert({owner_id:st.user.id,lesson_exercise_id:replaceCtx.item.id,old_exercise_id:old,new_exercise_id:newId});const lessonId=replaceCtx.lesson.id;$('#replacePickerModal').close();toast('Attività sostituita');await loadCore();await openLesson(lessonId)}
async function applyPrimaryReplacement(id){if(!replaceCtx)return;const g=primaryById(id);if(!g)return;const old=replaceCtx.item.exercise_id||null;const marker=g.is_custom?`PRIMARY_GAME:CUSTOM:${g.id}`:`PRIMARY_GAME:BOOK:${g.source_page}`;const{error}=await db.from('pe_lesson_exercises').update({exercise_id:null,custom_title:g.title,custom_explanation:g.description,custom_field_dimensions:g.material_spaces,primary_game_ref:marker,replaced_from_exercise_id:old,replaced_at:new Date().toISOString(),replacement_reason:'manual_change_primary'}).eq('id',replaceCtx.item.id);if(error)return toast(error.message);await db.from('pe_lesson_exercise_replacements').insert({owner_id:st.user.id,lesson_exercise_id:replaceCtx.item.id,old_exercise_id:old,new_exercise_id:null});const lessonId=replaceCtx.lesson.id;$('#replacePickerModal').close();toast('Gioco primaria inserito nella lezione');await loadCore();await openLesson(lessonId)}
function renderSports(){const term=$('#sportSearch').value.toLowerCase().trim();const arr=st.sports.filter(x=>!term||x.name.toLowerCase().includes(term));const primaryMatch=!term||'giochi scuola primaria'.includes(term)||'primaria'.includes(term)||'giochi'.includes(term);const primaryCount=(st.primaryDefaults?.length||75)+(st.primaryCustom?.length||0);$('#archiveTotal').textContent=Object.values(st.sportCounts).reduce((a,b)=>a+b,0)+primaryCount;let cards=arr.map((s,i)=>`<article class="sport-card tone-${(i%5)+1}" data-sport="${s.id}"><div class="sport-icon">${iconMap[s.slug]||'🏅'}</div><h4>${esc(s.name)}</h4><p>${esc(s.description||'Archivio didattico con progressioni, varianti e spiegazioni complete.')}</p><div class="sport-footer"><span class="sport-count">${st.sportCounts[s.id]||0} attività</span><span class="sport-arrow">→</span></div></article>`).join('');if(primaryMatch)cards+=`<article class="sport-card primary-sport-card" data-primary-sport="1"><div class="sport-icon">✹</div><h4>Giochi Scuola Primaria</h4><p>I 75 giochi del tuo libro più quelli creati da te, con immagini, regole, varianti e difficoltà.</p><div class="sport-footer"><span class="sport-count">${primaryCount} giochi</span><span class="sport-arrow">→</span></div></article>`;$('#sportsGrid').innerHTML=cards;$$('[data-sport]').forEach(x=>x.onclick=()=>openSport(x.dataset.sport));$$('[data-primary-sport]').forEach(x=>x.onclick=async()=>{await loadPrimaryGames();go('primarygames')})}
$('#sportSearch').oninput=renderSports;
$('#backSports').onclick=()=>{$('#sportDetail').classList.add('hidden');$('#sportLanding').classList.remove('hidden');st.currentSport=null};
async function openSport(id){st.currentSport=st.sports.find(x=>x.id===id);$('#sportLanding').classList.add('hidden');$('#sportDetail').classList.remove('hidden');let{data:cats}=await db.from('pe_categories').select('*').eq('sport_id',id).order('sort_order');st.categories=cats||[];$('#categoryFilter').innerHTML='<option value="">Tutte le categorie</option>'+st.categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');$('#sportDetailHero').innerHTML=`<span class="kicker">${iconMap[st.currentSport.slug]||'🏅'} ARCHIVIO SPORT</span><h3>${esc(st.currentSport.name)}</h3><p>${st.sportCounts[id]||0} attività verificate · ${st.categories.length} categorie</p><div class="category-pills">${st.categories.slice(0,12).map(c=>`<span class="chip">${esc(c.name)}</span>`).join('')}</div>`;await loadExercises()}
async function loadExercises(){let q=db.from('pe_exercises').select('id,name,student_explanation,difficulty,duration_min,duration_max,field_dimensions,category_id,fun_score').eq('sport_id',st.currentSport.id).eq('active',true).eq('audit_status','VERIFIED').order('name').limit(500);if($('#categoryFilter').value)q=q.eq('category_id',$('#categoryFilter').value);if($('#difficultyFilter').value)q=q.eq('difficulty',+$('#difficultyFilter').value);if($('#exerciseSearch').value.trim())q=q.ilike('name',`%${$('#exerciseSearch').value.trim()}%`);let{data}=await q;st.currentExercises=data||[];$('#exerciseGrid').innerHTML=st.currentExercises.map(e=>`<article class="exercise-card"><h4>${esc(e.name)}</h4><p>${esc((e.student_explanation||'').slice(0,160))}${(e.student_explanation||'').length>160?'…':''}</p><div class="category-pills"><span class="chip">Liv. ${e.difficulty||'—'}</span><span class="chip">${e.duration_min||'—'}–${e.duration_max||'—'}'</span>${e.fun_score?`<span class="chip good">Fun ${e.fun_score}/5</span>`:''}</div><button class="btn secondary small-btn open-ex" data-open-ex="${e.id}">Apri scheda</button></article>`).join('');$$('[data-open-ex]').forEach(b=>b.onclick=()=>openExercise(b.dataset.openEx))}
['categoryFilter','difficultyFilter'].forEach(id=>$('#'+id).onchange=loadExercises);$('#exerciseSearch').oninput=loadExercises;
async function openExercise(id){let{data:e}=await db.from('pe_exercises').select('*,pe_categories(name)').eq('id',id).single();$('#exerciseModalTitle').textContent=e.name;const box=(t,v)=>`<div class="detail-box"><b>${t}</b><p>${esc(v||'—')}</p></div>`;$('#exerciseModalBody').innerHTML=`<div class="category-pills"><span class="chip">${esc(e.pe_categories?.name||'')}</span><span class="chip">Livello ${e.difficulty||'—'}</span><span class="chip">${e.duration_min||'—'}–${e.duration_max||'—'}'</span><span class="chip">${esc(e.field_dimensions||'')}</span></div><div class="detail-grid" style="margin-top:12px">${box('COSA DEVI FARE',e.student_explanation)}${box('SPIEGAZIONE DOCENTE',e.teacher_explanation)}${box('OBIETTIVO',e.objective)}${box('ORGANIZZAZIONE',e.organization)}${box('REGOLE',e.rules)}${box('VARIANTI',e.variants)}${box('FACILITAZIONI',e.regressions)}${box('PROGRESSIONI',e.progressions)}${box('ERRORI',e.common_errors)}${box('CORREZIONI',e.corrections)}${box('CUE DOCENTE',e.teacher_cues)}${box('SICUREZZA',e.safety_notes)}</div>`;$('#exerciseModal').showModal()}
function renderTests(){$('#testsGrid').innerHTML=st.tests.map(t=>`<article class="test-card"><h4>${esc(t.name)}</h4><p>Unità: ${esc(t.unit)}</p><div class="test-direction">${t.result_direction==='lower_better'?'↓ MIGLIORE IL VALORE PIÙ BASSO':'↑ MIGLIORE IL VALORE PIÙ ALTO'}</div></article>`).join('');loadHof()}
$('#newTestBtn').onclick=()=>$('#testModal').showModal();
$('#testForm').onsubmit=async e=>{e.preventDefault();const slug=$('#testName').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now();let{error}=await db.from('pe_motor_tests').insert({owner_id:st.user.id,name:$('#testName').value,slug,unit:$('#testUnit').value,result_direction:$('#testDirection').value,is_default:false,active:true});if(error)return toast(error.message);$('#testModal').close();toast('Test creato');await loadCore()}
$$('[data-testtab]').forEach(b=>b.onclick=()=>{$$('[data-testtab]').forEach(x=>x.classList.toggle('active',x===b));$$('.testtab').forEach(x=>x.classList.toggle('active',x.id===`testtab-${b.dataset.testtab}`));if(b.dataset.testtab==='rankings')loadRankings();if(b.dataset.testtab==='hof')loadHof()});
$('#sessionForm').onsubmit=async e=>{e.preventDefault();if(!requireSchoolYear('Crea prima l’anno scolastico per registrare i test.'))return;const cid=$('#sessionClass').value,tid=$('#sessionTest').value,date=$('#sessionDate').value;if(!cid||!tid)return;let test=st.tests.find(x=>x.id===tid);let{data:ses,error}=await db.from('pe_motor_test_sessions').insert({owner_id:st.user.id,school_year_id:st.year.id,class_id:cid,test_id:tid,session_date:date,title:test.name}).select().single();if(error)return toast(error.message);renderResultEntry(ses,test,cid)}
async function renderResultEntry(session,test,cid){let{data:en}=await db.from('pe_student_enrollments').select('student_id,pe_students(*)').eq('class_id',cid).eq('active',true);$('#sessionResultsArea').innerHTML=`<div class="panel glass" style="margin-top:14px"><span class="kicker">${esc(test.name)}</span><h3>Inserisci risultati</h3><div id="resultRows">${(en||[]).map(x=>`<div class="ranking-row"><div>${x.pe_students.sex==='F'?'♀':'♂'}</div><div><strong>${esc(x.pe_students.first_name)} ${esc(x.pe_students.last_name)}</strong></div><input style="max-width:120px" type="number" step="0.01" data-result-student="${x.student_id}" placeholder="${esc(test.unit)}"></div>`).join('')}</div><button id="saveResults" class="btn primary" style="margin-top:12px">Salva risultati</button></div>`;$('#saveResults').onclick=async()=>{const rows=[];$$('[data-result-student]').forEach(i=>{if(i.value!=='')rows.push({owner_id:st.user.id,session_id:session.id,student_id:i.dataset.resultStudent,result_value:+i.value})});if(rows.length){let{error}=await db.from('pe_motor_test_results').insert(rows);if(error)return toast(error.message)}toast('Risultati salvati');await loadCore();loadRankings()}}
async function loadRankings(){const cid=$('#rankingClass').value||st.classes[0]?.id,sex=$('#rankingSex').value;if(!cid)return;let{data:t}=await db.from('pe_motor_test_total_rankings').select('*').eq('class_id',cid).eq('sex',sex).order('total_place');$('#totalRanking').innerHTML=(t||[]).map(x=>`<div class="ranking-row"><div class="rank-pos">${x.total_place}</div><div><strong>${esc(x.first_name)} ${esc(x.last_name)}</strong><small>${x.scored_results} risultati a punti</small></div><div class="rank-points">${x.total_points} pt</div></div>`).join('')||'<p class="muted">Nessun risultato.</p>';let{data:sess}=await db.from('pe_motor_test_sessions').select('id').eq('class_id',cid).order('session_date',{ascending:false}).limit(1);if(sess?.length){let{data:r}=await db.from('pe_motor_test_rankings').select('*').eq('session_id',sess[0].id).eq('sex',sex).order('place');$('#singleRanking').innerHTML=(r||[]).map(x=>`<div class="ranking-row"><div class="rank-pos">${x.place}</div><div><strong>${esc(x.first_name)} ${esc(x.last_name)}</strong><small>${x.result_value} ${esc(x.unit)}</small></div><div class="rank-points">${x.points} pt</div></div>`).join('')}else $('#singleRanking').innerHTML='<p class="muted">Nessun test registrato.</p>'}
$('#rankingClass').onchange=loadRankings;$('#rankingSex').onchange=loadRankings;
async function loadHof(){let q=db.from('pe_motor_test_hall_of_fame').select('*');if($('#hofTest').value)q=q.eq('test_id',$('#hofTest').value);if($('#hofSex').value)q=q.eq('sex',$('#hofSex').value);let{data}=await q.limit(100);$('#hofGrid').innerHTML=(data||[]).map(x=>`<article class="hof-card"><div class="medal">🏆</div><span class="kicker">${esc(x.test_name)} · ${x.sex==='F'?'FEMMINE':'MASCHI'}</span><h4>${esc(x.first_name)} ${esc(x.last_name)}</h4><div class="hof-value">${x.result_value} ${esc(x.unit)}</div><small>${esc(x.class_name||'')} · ${esc(x.school_year_label||'')}</small></article>`).join('')||'<p class="muted">La Hall of Fame si riempirà con i primi risultati.</p>'}
$('#hofTest').onchange=loadHof;$('#hofSex').onchange=loadHof;
function renderCalendar(){let d=st.month,y=d.getFullYear(),m=d.getMonth();$('#monthTitle').textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(d);let first=new Date(y,m,1),start=new Date(y,m,1-((first.getDay()+6)%7)),html=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(x=>`<div class="cal-head">${x}</div>`).join('');for(let i=0;i<42;i++){let day=new Date(start);day.setDate(start.getDate()+i);let iso=day.toISOString().slice(0,10),ev=st.lessons.filter(x=>x.lesson_date===iso).map(x=>`<div class="cal-event" data-lesson="${x.id}">${esc(x.title)}</div>`).join(''),ex=st.exceptions.filter(x=>iso>=x.exception_date&&iso<=(x.end_date||x.exception_date)).map(x=>`<div class="cal-event exception">${esc(x.reason||x.exception_type)}</div>`).join('');html+=`<div class="cal-day ${day.getMonth()!==m?'off':''}"><div class="cal-num">${day.getDate()}</div>${ex}${ev}</div>`}$('#calendarGrid').innerHTML=html;$$('#calendarGrid [data-lesson]').forEach(b=>b.onclick=()=>openLesson(b.dataset.lesson))}
$('#prevMonth').onclick=()=>{st.month=new Date(st.month.getFullYear(),st.month.getMonth()-1,1);renderCalendar()};$('#nextMonth').onclick=()=>{st.month=new Date(st.month.getFullYear(),st.month.getMonth()+1,1);renderCalendar()};
function openException(scope='school'){$('#exceptionScope').value=scope;$('#exceptionClassWrap').classList.toggle('hidden',scope==='school');$('#exceptionModal').showModal()}$('#addException').onclick=()=>openException();$('#schoolClosureBtn').onclick=()=>openException();$('#exceptionScope').onchange=()=>$('#exceptionClassWrap').classList.toggle('hidden',$('#exceptionScope').value==='school');
$('#exceptionForm').onsubmit=async e=>{e.preventDefault();if(!requireSchoolYear('Crea prima l’anno scolastico per inserire chiusure e gite.'))return;const school=$('#exceptionScope').value==='school';let{error}=await db.from('pe_calendar_exceptions').insert({owner_id:st.user.id,school_year_id:st.year.id,class_id:school?null:$('#exceptionClass').value,exception_date:$('#exceptionStart').value,end_date:$('#exceptionEnd').value,scope:school?'school':'class',exception_type:$('#exceptionType').value,reason:$('#exceptionReason').value||null,all_day:true});if(error)return toast(error.message);$('#exceptionModal').close();toast('Calendario aggiornato');await loadCore();renderCalendar()}
function renderSettings(){
  $('#closureList').innerHTML=st.exceptions.filter(x=>x.scope==='school').map(x=>listItem(x.reason||'Chiusura',`${fmt(x.exception_date)}${x.end_date!==x.exception_date?' → '+fmt(x.end_date):''}`,`<span class="chip">${x.exception_type}</span>`)).join('')||listItem('Nessuna chiusura','Inserisci ponti e vacanze');
  $('#activeYearStatus').innerHTML=st.year?`<span class="chip good">Attivo</span><strong>${esc(st.year.label)}</strong><small>${fmt(st.year.start_date)} → ${fmt(st.year.end_date)}</small>`:`<span class="chip warn">Da configurare</span><strong>Nessun anno scolastico attivo</strong><small>Crealo prima di classi, calendario e test.</small>`;
  $('#migrateYearBtn').textContent=st.year?'Crea nuovo anno scolastico':'Crea il primo anno scolastico';
}
$('#migrateYearBtn').onclick=()=>openSchoolYearDialog(!st.year);
$('#migrateForm').onsubmit=async e=>{
  e.preventDefault();const btn=$('#migrateSubmitBtn');btn.disabled=true;btn.textContent='Salvataggio…';
  try{
    const label=$('#newYearLabel').value.trim(),start=$('#newYearStart').value,end=$('#newYearEnd').value;
    if(!label||!start||!end)throw new Error('Completa tutti i dati dell’anno scolastico.');
    if(end<=start)throw new Error('La data di fine deve essere successiva alla data di inizio.');
    if(!st.year){
      const{error}=await db.from('pe_school_years').insert({owner_id:st.user.id,label,start_date:start,end_date:end,is_active:true});
      if(error)throw error;toast('Anno scolastico creato');
    }else{
      const promote=(document.querySelector('input[name=\"promoteClasses\"]:checked')?.value||'yes')==='yes';
      if(promote){
        const{data,error}=await db.rpc('pe_migrate_school_year',{p_new_label:label,p_start_date:start,p_end_date:end,p_archive_old:true});
        if(error)throw error;
        const migrated=data?.migrated_classes??0,archived=data?.archived_final_cycle_classes??0;
        toast(`Nuovo anno creato: ${migrated} classi promosse, ${archived} classi terminali archiviate`);
      }else{
        const{error:offErr}=await db.from('pe_school_years').update({is_active:false,updated_at:new Date().toISOString()}).eq('owner_id',st.user.id).eq('is_active',true);
        if(offErr)throw offErr;
        const{error:newErr}=await db.from('pe_school_years').insert({owner_id:st.user.id,label,start_date:start,end_date:end,is_active:true});
        if(newErr)throw newErr;
        toast('Nuovo anno creato senza promuovere le classi');
      }
    }
    $('#migrateModal').close();await loadCore();renderAll();
  }catch(err){console.error(err);toast(err.message||'Impossibile creare l’anno scolastico')}
  finally{btn.disabled=false;btn.textContent=st.year?'Crea nuovo anno scolastico':'Crea anno scolastico'}
}


$('#backPrimaryToSports').onclick=()=>go('sports');

/* --- GIOCHI SCUOLA PRIMARIA --- */
const PRIMARY_BUCKET='pe-primary-games';
const primaryEscLines=v=>esc(v).replace(/\n/g,'<br>');
function diffDots(n){return `<span class="difficulty-dots" title="Difficoltà ${n}/5">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`}
async function loadPrimaryDefaults(){
  if(st.primaryDefaults.length)return st.primaryDefaults;
  const r=await fetch('./primary_games.json');
  if(!r.ok)throw new Error('Archivio giochi primari non disponibile');
  st.primaryDefaults=(await r.json()).map(x=>({...x,id:`book-${x.source_page}`,is_custom:false,_imageUrl:'./'+x.image_path}));
  return st.primaryDefaults;
}
async function loadPrimaryCustom(){
  if(!st.user)return [];
  const{data,error}=await db.from('pe_primary_games').select('*').order('created_at',{ascending:false});
  if(error)throw error;
  const rows=data||[];
  await Promise.all(rows.map(async g=>{
    if(g.image_kind==='storage'&&g.image_path){const{data:sig}=await db.storage.from(PRIMARY_BUCKET).createSignedUrl(g.image_path,86400);g._imageUrl=sig?.signedUrl||''}
  }));
  st.primaryCustom=rows;return rows;
}
async function loadPrimaryGames(){
  try{await Promise.all([loadPrimaryDefaults(),loadPrimaryCustom()]);st.primaryGames=[...st.primaryCustom,...st.primaryDefaults];renderPrimaryGames()}catch(err){console.error(err);toast('Errore caricamento giochi primaria')}
}
function renderPrimaryGames(){
  const q=($('#primaryGameSearch')?.value||'').trim().toLowerCase(),d=$('#primaryDifficulty')?.value||'';
  const all=st.primaryGames||[];
  const rows=all.filter(g=>(!d||String(g.difficulty)===d)&&(!q||[g.title,g.material_spaces,g.description,g.rules,g.variants].join(' ').toLowerCase().includes(q)));
  $('#primaryGameCount').textContent=all.length;
  $('#primaryGamesGrid').innerHTML=rows.map(g=>`<article class="primary-game-card" data-primary-game="${esc(g.id)}"><img class="primary-game-thumb" src="${esc(g._imageUrl||('./'+g.image_path))}" alt="${esc(g.title)}" loading="lazy"><div class="primary-game-card-body"><div class="primary-game-card-head"><h4>${esc(g.title)}</h4>${diffDots(g.difficulty)}</div><p>${esc(g.description)}</p><div class="primary-game-meta"><span class="primary-source">${g.is_custom?'Creato da te':`Libro · pagina ${g.source_page}`}</span>${g.is_custom?'<span class="primary-custom-badge">PERSONALE</span>':''}</div></div></article>`).join('')||'<article class="panel glass"><h3>Nessun gioco trovato</h3><p class="muted">Prova a cambiare ricerca o difficoltà.</p></article>';
  $$('[data-primary-game]').forEach(x=>x.onclick=()=>openPrimaryGame(x.dataset.primaryGame));
}
function primaryById(id){return st.primaryGames.find(g=>String(g.id)===String(id))}
function primaryBox(label,text){return `<div class="primary-detail-box"><b>${label}</b><p>${primaryEscLines(text||'—')}</p></div>`}
function openPrimaryGame(id){
  const g=primaryById(id);if(!g)return;
  $('#primaryGameModalTitle').textContent=g.title;
  $('#primaryGameModalBody').innerHTML=`<div class="primary-detail-layout"><div><img class="primary-detail-image" src="${esc(g._imageUrl||('./'+g.image_path))}" alt="${esc(g.title)}"><div class="primary-detail-actions"><span class="chip">Difficoltà ${g.difficulty}/5</span>${g.is_custom?`<button class="btn secondary small-btn" id="editPrimaryGame">Modifica</button><button class="btn ghost small-btn" id="deletePrimaryGame">Elimina</button>`:`<span class="chip">Pagina ${g.source_page} · LIBRO GIOCHI</span>`}</div></div><div class="primary-detail-sections">${primaryBox('MATERIALE E SPAZI',g.material_spaces)}${primaryBox('DESCRIZIONE',g.description)}${primaryBox('REGOLE',g.rules)}${primaryBox('VARIANTI',g.variants)}</div></div>`;
  if(g.is_custom){$('#editPrimaryGame').onclick=()=>{$('#primaryGameModal').close();openPrimaryGameForm(g)};$('#deletePrimaryGame').onclick=()=>deletePrimaryGame(g)}
  $('#primaryGameModal').showModal();
}
function openPrimaryGameForm(g=null){
  $('#primaryGameForm').reset();$('#primaryGameId').value=g?.id||'';$('#primaryExistingImage').value=g?.image_path||'';$('#primaryGameFormTitle').textContent=g?'Modifica gioco':'Nuovo gioco';$('#primaryFormMsg').textContent='';
  $('#primaryTitle').value=g?.title||'';$('#primaryDiff').value=g?.difficulty||1;$('#primaryMaterials').value=g?.material_spaces||'';$('#primaryDescription').value=g?.description||'';$('#primaryRules').value=g?.rules||'';$('#primaryVariants').value=g?.variants||'';
  $('#primaryImagePreview').innerHTML=g?`<img src="${esc(g._imageUrl||'')}" alt="Anteprima">`:'';
  $('#primaryGameFormModal').showModal();
}
$('#newPrimaryGameBtn').onclick=()=>openPrimaryGameForm();
$('#primaryGameSearch').oninput=renderPrimaryGames;$('#primaryDifficulty').onchange=renderPrimaryGames;
$('#primaryImage').onchange=e=>{const f=e.target.files?.[0];if(!f){$('#primaryImagePreview').innerHTML='';return}if(f.size>5*1024*1024){toast('Immagine troppo grande: massimo 5 MB');e.target.value='';return}const u=URL.createObjectURL(f);$('#primaryImagePreview').innerHTML=`<img src="${u}" alt="Anteprima nuova immagine">`};
function primarySlug(v){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
$('#primaryGameForm').onsubmit=async e=>{
  e.preventDefault();const msg=$('#primaryFormMsg');msg.textContent='Salvataggio e sincronizzazione…';
  const id=$('#primaryGameId').value||null,file=$('#primaryImage').files?.[0];let imagePath=$('#primaryExistingImage').value||null;
  try{
    if(!id&&!file){msg.textContent='Carica un’immagine per il nuovo gioco.';return}
    if(file){
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${st.user.id}/${Date.now()}-${primarySlug($('#primaryTitle').value)||'gioco'}.${ext}`;
      const{error:upErr}=await db.storage.from(PRIMARY_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(upErr)throw upErr;
      imagePath=path;
    }
    const payload={owner_id:st.user.id,title:$('#primaryTitle').value.trim(),slug:(primarySlug($('#primaryTitle').value)||'gioco')+'-'+(id?String(id).slice(0,8):Date.now()),difficulty:+$('#primaryDiff').value,material_spaces:$('#primaryMaterials').value.trim(),description:$('#primaryDescription').value.trim(),rules:$('#primaryRules').value.trim(),variants:$('#primaryVariants').value.trim(),image_kind:'storage',image_path:imagePath,is_custom:true,source_book:null,source_page:null,updated_at:new Date().toISOString()};
    let error;if(id){({error}=await db.from('pe_primary_games').update(payload).eq('id',id))}else{({error}=await db.from('pe_primary_games').insert(payload))}if(error)throw error;
    $('#primaryGameFormModal').close();toast(id?'Gioco aggiornato':'Nuovo gioco creato');await loadPrimaryCustom();st.primaryGames=[...st.primaryCustom,...st.primaryDefaults];renderPrimaryGames();
  }catch(err){console.error(err);msg.textContent='Errore: '+(err.message||'salvataggio non riuscito')}
};
async function deletePrimaryGame(g){
  if(!confirm(`Eliminare definitivamente “${g.title}”?`))return;
  try{if(g.image_kind==='storage'&&g.image_path)await db.storage.from(PRIMARY_BUCKET).remove([g.image_path]);const{error}=await db.from('pe_primary_games').delete().eq('id',g.id);if(error)throw error;$('#primaryGameModal').close();toast('Gioco eliminato');await loadPrimaryCustom();st.primaryGames=[...st.primaryCustom,...st.primaryDefaults];renderPrimaryGames()}catch(err){toast('Impossibile eliminare il gioco');console.error(err)}
}

function setSyncState(kind='ok',label='Sincronizzato'){const el=$('#syncStatus');if(!el)return;el.classList.toggle('syncing',kind==='syncing');el.classList.toggle('error',kind==='error');const t=el.querySelector('span');if(t)t.textContent=label}
let syncBusy=false,lastSyncAt=0;
async function syncFromCloud({quiet=false}={}){if(!st.user||syncBusy)return;syncBusy=true;if(!quiet)setSyncState('syncing','Sincronizzo…');try{await loadCore();if(st.primaryDefaults.length){await loadPrimaryCustom();st.primaryGames=[...st.primaryCustom,...st.primaryDefaults];if($('#view-primarygames').classList.contains('active'))renderPrimaryGames()}renderSports();renderCalendar();lastSyncAt=Date.now();setSyncState('ok','Sincronizzato')}catch(err){console.error(err);setSyncState('error','Sync non riuscita')}finally{syncBusy=false}}
$('#loginForm').onsubmit=async e=>{e.preventDefault();const msg=$('#loginMsg');msg.textContent='Accesso sicuro…';const email=$('#email').value.trim();const password=$('#password').value;let{error}=await db.auth.signInWithPassword({email,password});if(error){msg.textContent='Email o password non corrette.';return}msg.textContent=''};
$('#logoutBtn').onclick=()=>db.auth.signOut();
async function enter(user){st.user=user;$('#userMail').textContent=user.email||'';$('#authView').classList.add('hidden');$('#appView').classList.remove('hidden');await syncFromCloud()}
let{data:{session}}=await db.auth.getSession();if(session)await enter(session.user);
db.auth.onAuthStateChange((event,se)=>{if(se&&!st.user)setTimeout(()=>enter(se.user),0);if(!se){st.user=null;$('#appView').classList.add('hidden');$('#authView').classList.remove('hidden')}});
addEventListener('online',()=>syncFromCloud());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastSyncAt>5000)syncFromCloud({quiet:true})});
setInterval(()=>{if(document.visibilityState==='visible')syncFromCloud({quiet:true})},45000);
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
