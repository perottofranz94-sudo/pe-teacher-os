
import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import{SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}from'./config.js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const st={user:null,year:null,schoolYears:[],classes:[],sports:[],sportCounts:{},lessons:[],modules:[],tests:[],exceptions:[],hof:[],month:new Date(),currentSport:null,currentExercises:[],categories:[],primaryDefaults:[],primaryCustom:[],primaryGames:[]};
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=d=>new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00'));
const localISODate=d=>{const x=d instanceof Date?d:new Date(d),pad=n=>String(n).padStart(2,'0');return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
const iconMap={'pallacanestro':'🏀','ultimate-frisbee':'🥏','pallamano':'🤾','pallavolo':'🏐','badminton':'🏸','tennis':'🎾','calcio-a-5':'⚽','atletica-leggera':'🏃','rugby':'🏉','orienteering':'🧭','giochi-tradizionali':'🪁','baseball':'⚾','judo':'🥋','giocoleria':'🎪','fitness':'🏋️'};
const phaseLabel={activation:'ATTIVAZIONE',main:'PARTE CENTRALE',final:'APPLICAZIONE FINALE',closing:'CHIUSURA',warmup:'ATTIVAZIONE',technical:'TECNICA',tactical:'PARTE CENTRALE',game:'PARTITA / SSG',assessment:'VALUTAZIONE',cooldown:'CHIUSURA'};

const schoolLevelLabels={primary:'Scuola primaria',lower_secondary:'Secondaria di primo grado',upper_secondary:'Secondaria di secondo grado'};
const schoolGradeOptions={primary:[['1','Prima primaria'],['2','Seconda primaria'],['3','Terza primaria'],['4','Quarta primaria'],['5','Quinta primaria']],lower_secondary:[['1','Prima media'],['2','Seconda media'],['3','Terza media']],upper_secondary:[['1','Prima superiore'],['2','Seconda superiore'],['3','Terza superiore'],['4','Quarta superiore'],['5','Quinta superiore']]};
let classOriginalStudentIds=[];
const weekdayOptions=[[1,'Lunedì'],[2,'Martedì'],[3,'Mercoledì'],[4,'Giovedì'],[5,'Venerdì'],[6,'Sabato'],[7,'Domenica']];
function minutesBetween(start,end){if(!start||!end)return 0;const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);return (eh*60+em)-(sh*60+sm)}
function addTimetableRow(weekday=1,start='',end=''){
  const d=document.createElement('div');
  d.className='timetable-row';

  d.innerHTML=`
    <label class="tt-field tt-day-field">
      Giorno
      <select class="tt-day">
        ${weekdayOptions.map(([v,l])=>`
          <option value="${v}" ${Number(weekday)===v?'selected':''}>
            ${l}
          </option>
        `).join('')}
      </select>
    </label>

    <label class="tt-field">
      Inizio
      <input
        class="tt-start"
        type="time"
        value="${esc(start||'')}"
      >
    </label>

    <label class="tt-field">
      Fine
      <input
        class="tt-end"
        type="time"
        value="${esc(end||'')}"
      >
    </label>

    <button
      type="button"
      class="tt-remove"
      aria-label="Rimuovi giorno"
    >×</button>
  `;

  const startInput=d.querySelector('.tt-start');
  const endInput=d.querySelector('.tt-end');

  startInput.addEventListener('change',()=>{
    if(!startInput.value) return;

    const [h,m]=startInput.value.split(':').map(Number);

    const startMinutes=(h*60)+m;
    const suggestedMinutes=startMinutes+60;

    const endH=Math.floor(suggestedMinutes/60)%24;
    const endM=suggestedMinutes%60;

    const suggested=
      `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;

    /*
     * Imposta automaticamente +1 ora solo se:
     * - Fine è vuota
     * - oppure Fine è uguale/prima dell'inizio
     *
     * Se il docente ha già scelto manualmente un orario valido,
     * non viene sovrascritto.
     */
    if(
      !endInput.value ||
      minutesBetween(startInput.value,endInput.value)<=0
    ){
      endInput.value=suggested;
    }
  });

  d.querySelector('.tt-remove').onclick=()=>{
    if($$('.timetable-row').length>1){
      d.remove();
    }else{
      startInput.value='';
      endInput.value='';
    }
  };

  $('#timetableRows').appendChild(d);
}
function collectTimetableRows(){return $$('.timetable-row').map(r=>({weekday:Number(r.querySelector('.tt-day').value),start:r.querySelector('.tt-start').value,end:r.querySelector('.tt-end').value})).filter(x=>x.start||x.end)}
async function loadClassTimetable(classId){$('#timetableRows').innerHTML='';if(!classId){addTimetableRow(1,'','');return}const{data,error}=await db.from('pe_class_timetable_slots').select('*').eq('class_id',classId).eq('active',true).order('weekday').order('start_time');if(error)throw error;(data||[]).forEach(x=>addTimetableRow(x.weekday,String(x.start_time||'').slice(0,5),String(x.end_time||'').slice(0,5)));if(!(data||[]).length)addTimetableRow(1,'','')}
async function saveClassTimetable(classId,rows){const{error:delErr}=await db.from('pe_class_timetable_slots').delete().eq('class_id',classId);if(delErr)throw delErr;const payload=rows.map(x=>({owner_id:st.user.id,class_id:classId,weekday:x.weekday,start_time:x.start,end_time:x.end,lesson_minutes:minutesBetween(x.start,x.end),valid_from:st.year?.start_date||null,valid_to:st.year?.end_date||null,active:true}));if(payload.length){const{error}=await db.from('pe_class_timetable_slots').insert(payload);if(error)throw error}}
async function applyTimetableTimesToModule(moduleId,classId){const[{data:slots,error:se},{data:lessons,error:le}]=await Promise.all([db.from('pe_class_timetable_slots').select('*').eq('class_id',classId).eq('active',true),db.from('pe_lessons').select('id,lesson_date').eq('module_id',moduleId)]);if(se)throw se;if(le)throw le;for(const lesson of lessons||[]){const dt=new Date(lesson.lesson_date+'T12:00:00'),wd=dt.getDay()===0?7:dt.getDay(),slot=(slots||[]).filter(s=>Number(s.weekday)===wd).sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)))[0];if(slot){const{error}=await db.from('pe_lessons').update({start_time:slot.start_time,end_time:slot.end_time}).eq('id',lesson.id);if(error)throw error}}}
function currentSchoolYearDefaults(){const now=new Date(),startYear=now.getMonth()>=6?now.getFullYear():now.getFullYear()-1;return{label:`${startYear}/${startYear+1}`,start:`${startYear}-09-01`,end:`${startYear+1}-06-30`}}
function openSchoolYearDialog(initial=!st.year){const d=currentSchoolYearDefaults();$('#migrateModalTitle').textContent=initial?'Crea il primo anno scolastico':'Crea nuovo anno scolastico';$('#promoteClassesWrap').classList.toggle('hidden',initial);$('#migrateSubmitBtn').textContent=initial?'Crea anno scolastico':'Crea nuovo anno scolastico';const yes=document.querySelector('input[name=\"promoteClasses\"][value=\"yes\"]');if(yes)yes.checked=true;if(initial||!$('#newYearLabel').value){$('#newYearLabel').value=d.label;$('#newYearStart').value=d.start;$('#newYearEnd').value=d.end}$('#migrateModal').showModal()}
function requireSchoolYear(message='Prima devi creare un anno scolastico.'){if(st.year)return true;toast(message);openSchoolYearDialog(true);return false}
async function openPlannerFromDashboard(){

  // STEP 1 — serve prima un anno scolastico
  if(!st.year){

    const createYear = await appConfirm({
      icon:'📅',
      kicker:'PRIMA CONFIGURAZIONE',
      title:'Prima creiamo il tuo anno scolastico',
      message:'Per generare una programmazione AttivaMente deve sapere in quale anno scolastico stai lavorando.',
      details:'Dopo aver creato l’anno scolastico potrai inserire le tue classi, il loro orario settimanale e successivamente generare automaticamente le lezioni.',
      confirmText:'Crea anno scolastico',
      danger:false
    });

    if(createYear){
      openSchoolYearDialog(true);
    }

    return;
  }

  // STEP 2 — serve almeno una classe
  if(!st.classes.length){

    const createClass = await appConfirm({
      icon:'👥',
      kicker:'MANCA ANCORA UN PASSAGGIO',
      title:'Ora crea almeno una classe',
      message:`L’anno scolastico ${st.year.label} è pronto, ma non hai ancora creato nessuna classe.`,
      details:'La programmazione viene costruita in base alla classe, al numero di alunni, al livello sportivo e all’orario settimanale.',
      confirmText:'Crea una classe',
      danger:false
    });

    if(createClass){
      go('classes');
      openClass(null);
    }

    return;
  }

  // Tutto pronto
  go('planner');
}
function updateGradeOptions(selected=''){const level=$('#classSchoolLevel').value,opts=schoolGradeOptions[level]||[];$('#classGrade').innerHTML=opts.length?opts.map(([v,l])=>`<option value="${v}" ${String(selected)===v?'selected':''}>${l}</option>`).join(''):'<option value="">Seleziona prima il grado scolastico</option>';$('#schoolLevelHelp').textContent=level?`Percorso: ${schoolLevelLabels[level]}. Potrai cambiare questa impostazione anche in seguito.`:'Seleziona prima il grado scolastico.'}

function appConfirm({
  icon='🗑️',
  kicker='CONFERMA ELIMINAZIONE',
  title='Vuoi continuare?',
  message='Questa operazione modificherà i dati salvati.',
  details='',
  confirmText='Elimina',
  danger=true
}={}){
  return new Promise(resolve=>{
    const modal=$('#appConfirmModal');
    if(!modal){resolve(false);return}
    $('#appConfirmIcon').textContent=icon;
    $('#appConfirmKicker').textContent=kicker;
    $('#appConfirmTitle').textContent=title;
    $('#appConfirmMessage').textContent=message;
    const det=$('#appConfirmDetails');
    if(details){det.textContent=details;det.classList.remove('hidden')}else{det.textContent='';det.classList.add('hidden')}
    const ok=$('#appConfirmOk'),cancel=$('#appConfirmCancel');
    ok.textContent=confirmText;
    ok.classList.toggle('danger',danger);
    ok.classList.toggle('primary',!danger);
    let settled=false;
    const finish=value=>{
      if(settled)return;settled=true;
      ok.onclick=null;cancel.onclick=null;
      try{modal.close()}catch{}
      resolve(value);
    };
    ok.onclick=()=>finish(true);
    cancel.onclick=()=>finish(false);
    modal.oncancel=e=>{e.preventDefault();finish(false)};
    modal.showModal();
  });
}

function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2300)}
function openMobileMenu(){const m=$('#mobileMenu'),b=$('#mobileMenuBackdrop');if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');b?.classList.remove('hidden');$('#mobileMenuBtn')?.setAttribute('aria-expanded','true');document.body.classList.add('menu-open')}
function closeMobileMenu(){const m=$('#mobileMenu'),b=$('#mobileMenuBackdrop');if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true');b?.classList.add('hidden');$('#mobileMenuBtn')?.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open')}
function go(v){closeMobileMenu();$$('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));let m={dashboard:['PANORAMICA','Dashboard'],calendar:['ANNO SCOLASTICO','Calendario'],classes:['GESTIONE','Classi'],planner:['MOTORE DIDATTICO','Programmazione'],sports:['MEGA ARCHIVIO','Archivio sport'],tests:['VALUTAZIONE','Test motori'],primarygames:['SCUOLA PRIMARIA','Giochi scuola primaria'],owner:['AREA RISERVATA','Area OWNER'],settings:['CONFIGURAZIONE','Impostazioni']}[v];$('#pageKicker').textContent=m[0];$('#pageTitle').textContent=m[1];if(v==='sports')renderSports();if(v==='primarygames')loadPrimaryGames();if(v==='tests')renderTests();if(v==='calendar')renderCalendar();if(v==='settings')renderSettings()}
$$('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));$$('[data-jump]').forEach(b=>b.onclick=()=>go(b.dataset.jump));$('#quickPlan').onclick=()=>go('planner');$('#heroSchoolYearBtn')?.addEventListener('click',()=>{
  openSchoolYearDialog(!st.year);
});

$('#heroPlannerBtn')?.addEventListener('click',()=>{
  openPlannerFromDashboard();
});$$('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$('#mobileMenuBtn')?.addEventListener('click',openMobileMenu);
$('#mobileMoreBtn')?.addEventListener('click',openMobileMenu);
$('#mobileMenuClose')?.addEventListener('click',closeMobileMenu);
$('#mobileMenuBackdrop')?.addEventListener('click',closeMobileMenu);
$('#mobileLogoutBtn')?.addEventListener('click',()=>db.auth.signOut());

async function loadCore(){

  const t0=performance.now();

  /*
   * =======================================================
   * FASE 1 — DATI ESSENZIALI
   * Devono arrivare velocemente.
   * =======================================================
   */

  const coreResults=await Promise.all([

    db
      .from('pe_school_years')
      .select('*')
      .eq('is_active',true)
      .maybeSingle(),

    db
      .from('pe_school_years')
      .select('*')
      .order('start_date',{ascending:false}),

    db
      .from('pe_classes')
      .select('*')
      .eq('archived',false)
      .order('school_level')
      .order('grade')
      .order('name'),

    db
      .from('pe_sports')
      .select('*')
      .eq('active',true)
      .order('name'),

    db
      .from('pe_lessons')
      .select(`
        *,
        pe_classes!pe_lessons_class_id_fkey(name),
        pe_sports(name)
      `)
      .order('lesson_date')
      .limit(80)

  ]);

  const coreError=coreResults.find(r=>r.error)?.error;

  if(coreError){
    throw coreError;
  }

  const [y,ys,c,s,l]=coreResults;

  st.year=y.data||null;
  st.schoolYears=ys.data||[];
  st.classes=c.data||[];
  st.sports=s.data||[];
  st.lessons=l.data||[];

  /*
   * Aggiorna SUBITO l'interfaccia.
   */

  const classOpts=st.classes
    .map(x=>`<option value="${x.id}">${esc(x.name)}</option>`)
    .join('');

  ['#extraClass','#manualClass'].forEach(id=>{
    if($(id)){
      $(id).innerHTML=classOpts;
    }
  });

  if($('#extraAutoSport')){
    $('#extraAutoSport').innerHTML=st.sports
      .map(x=>`<option value="${x.id}">${esc(x.name)}</option>`)
      .join('');
  }

  populateSelects();

  renderDashboard();
  renderClasses();
  renderSports();

  const coreMs=Math.round(performance.now()-t0);

  console.log(
    `[SYNC V2] dati essenziali pronti in ${coreMs} ms`
  );


  /*
   * =======================================================
   * FASE 2 — DATI SECONDARI
   * NON BLOCCANO l'app.
   * =======================================================
   */

  loadSecondaryData()
    .catch(err=>{
      console.warn(
        '[SYNC V2] dati secondari non disponibili',
        err
      );
    });


  /*
   * =======================================================
   * FASE 3 — CONTEGGI ARCHIVIO
   * Ancora più in background.
   * =======================================================
   */

  loadSportCounts()
    .catch(err=>{
      console.warn(
        '[SYNC V2] conteggi sport non disponibili',
        err
      );
    });
}
async function loadSecondaryData(){

  const t0=performance.now();

  const results=await Promise.allSettled([

    db
      .from('pe_sport_modules')
      .select(`
        *,
        pe_classes!pe_sport_modules_class_id_fkey(name),
        pe_sports(name)
      `)
      .order('start_date',{ascending:false})
      .limit(100),

    db
      .from('pe_motor_tests')
      .select('*')
      .eq('active',true)
      .order('name'),

    db
      .from('pe_calendar_exceptions')
      .select('*')
      .order('exception_date'),

    db
      .from('pe_motor_test_hall_of_fame')
      .select('*')
      .limit(40)

  ]);

  /*
   * Promise.allSettled:
   * se una query secondaria fallisce,
   * le altre continuano a funzionare.
   */

  const modulesResult=results[0];
  const testsResult=results[1];
  const exceptionsResult=results[2];
  const hofResult=results[3];

  if(
    modulesResult.status==='fulfilled' &&
    !modulesResult.value.error
  ){
    st.modules=modulesResult.value.data||[];
  }

  if(
    testsResult.status==='fulfilled' &&
    !testsResult.value.error
  ){
    st.tests=testsResult.value.data||[];
  }

  if(
    exceptionsResult.status==='fulfilled' &&
    !exceptionsResult.value.error
  ){
    st.exceptions=exceptionsResult.value.data||[];
  }

  if(
    hofResult.status==='fulfilled' &&
    !hofResult.value.error
  ){
    st.hof=hofResult.value.data||[];
  }

  renderModules();
  renderTests();
  renderSettings();
  renderDashboard();
  renderCalendar();

  const ms=Math.round(performance.now()-t0);

  console.log(
    `[SYNC V2] dati secondari pronti in ${ms} ms`
  );
}
async function loadSportCounts(){

  st.sportCounts={};

  const counts=await Promise.all(

    st.sports.map(async sp=>{

      const {count,error}=await db
        .from('pe_exercises')
        .select(
          '*',
          {
            count:'exact',
            head:true
          }
        )
        .eq('sport_id',sp.id)
        .eq('active',true)
        .eq('audit_status','VERIFIED');

      if(error){

        console.warn(
          `Conteggio esercizi non disponibile per ${sp.name}`,
          error
        );

        return [sp.id,0];
      }

      return [
        sp.id,
        count||0
      ];
    })

  );

  st.sportCounts=Object.fromEntries(counts);

  renderSports();
  renderDashboard();
}

function populateSelects(){
  const co='<option value="">Seleziona classe</option>'+st.classes.map(c=>`<option value="${c.id}">${esc(c.name)} · ${c.student_count} alunni</option>`).join('');
  ['planClass','sessionClass','rankingClass','exceptionClass','extraClass'].forEach(id=>$( '#'+id).innerHTML=co);
  const so='<option value="">Seleziona sport</option>'+st.sports.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('#planSport').innerHTML=so;
  const to='<option value="">Seleziona test</option>'+st.tests.map(t=>`<option value="${t.id}">${esc(t.name)} (${esc(t.unit)})</option>`).join('');
  $('#sessionTest').innerHTML=to;$('#rankingTest').innerHTML='<option value="">Tutti i test / ultimo test</option>'+st.tests.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');$('#hofTest').innerHTML='<option value="">Tutti i test</option>'+st.tests.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
  if(!$('#planStart').value)$('#planStart').value=localISODate(new Date());
  if(!$('#sessionDate').value)$('#sessionDate').value=localISODate(new Date());if($('#extraDate')&&!$('#extraDate').value)$('#extraDate').value=localISODate(new Date());
}
function listItem(a,b,c=''){return`<div class="list-item"><div><strong>${esc(a)}</strong><small>${esc(b)}</small></div>${c}</div>`}
function renderDashboard(){
  $('#statClasses').textContent=st.classes.length;$('#statSports').textContent=st.sports.length+1;$('#statLessons').textContent=st.lessons.length;$('#statTests').textContent=st.tests.length;
  $('#heroExerciseCount').textContent=Object.values(st.sportCounts).reduce((a,b)=>a+b,0)||1390;
  const today=localISODate(new Date()),u=st.lessons.filter(x=>x.lesson_date>=today).slice(0,6);
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
    const c=st.classes.find(x=>x.id===id);if(!c)return toast('Classe non trovata');$('#classModalTitle').textContent=c.name;$('#className').value=c.name;$('#classSchoolLevel').value=c.school_level||'';updateGradeOptions(c.grade);
    const{data:en,error}=await db.from('pe_student_enrollments').select('*,pe_students!pe_student_enrollments_student_id_fkey(*)').eq('class_id',id).eq('active',true);if(error)return toast(error.message);
    classOriginalStudentIds=(en||[]).map(x=>x.student_id);(en||[]).forEach(x=>addStudentRow(x.pe_students?.first_name,x.pe_students?.last_name,x.pe_students?.sex,x.pe_students?.id));
  }else{$('#classModalTitle').textContent='Nuova classe';$('#className').value='';$('#classSchoolLevel').value='';updateGradeOptions('')}
  await Promise.all([renderLevelGrid(id),loadClassTimetable(id)]);updateClassAutoCounts();$('#classModal').showModal();
}
function updateClassAutoCounts(){
  const rows=$$('.student-row');
  const active=rows.filter(r=>r.querySelector('.s-first').value.trim()||r.querySelector('.s-last').value.trim());
  const f=active.filter(r=>r.querySelector('.s-sex').value==='F').length;
  const m=active.filter(r=>r.querySelector('.s-sex').value==='M').length;
  const box=$('#classAutoCounts');
  if(box)box.innerHTML=`<span>👥 ${active.length} alunni</span><span>♀ ${f}</span><span>♂ ${m}</span><small>Conteggio automatico dai nominativi inseriti sotto.</small>`;
}
function addStudentRow(first='',last='',sex='F',id=''){
  let d=document.createElement('div');d.className='student-row';d.dataset.studentId=id;
  d.innerHTML=`<input class="s-first" placeholder="Nome" value="${esc(first)}"><input class="s-last" placeholder="Cognome" value="${esc(last)}"><select class="s-sex"><option value="F" ${sex==='F'?'selected':''}>F</option><option value="M" ${sex==='M'?'selected':''}>M</option></select><button type="button">×</button>`;
  d.querySelector('button').onclick=()=>{d.remove();updateClassAutoCounts()};
  d.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',updateClassAutoCounts));
  d.querySelector('.s-sex').addEventListener('change',updateClassAutoCounts);
  $('#studentRows').appendChild(d);updateClassAutoCounts()
}
$('#addStudentRow').onclick=()=>addStudentRow();$('#addTimetableRow').onclick=()=>addTimetableRow(1,'','');
async function renderLevelGrid(classId){
  let levels={};if(classId){const{data,error}=await db.from('pe_class_sport_levels').select('*').eq('class_id',classId);if(error)throw error;(data||[]).forEach(x=>levels[x.sport_id]=x.level)}
  $('#sportLevelGrid').innerHTML=st.sports.map(s=>`<div class="level-item"><span>${iconMap[s.slug]||'●'} ${esc(s.name)}</span><select data-sport-level="${s.id}"><option value="">Non impostato</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${levels[s.id]==n?'selected':''}>${n} · ${['','Principiante','Base','Intermedio','Avanzato','Molto avanzato'][n]}</option>`).join('')}</select></div>`).join('');
}
$('#classSchoolLevel').onchange=()=>updateGradeOptions('');

$('#deleteClassBtn').onclick=async()=>{
  const id=$('#classId').value;if(!id)return;
  const c=st.classes.find(x=>x.id===id);if(!c)return;
  if(!(await appConfirm({
    icon:'🏫',
    kicker:'ARCHIVIA CLASSE',
    title:`Archiviare “${c.name}”?`,
    message:'La classe non comparirà più nell’anno scolastico corrente, ma lo storico resterà conservato.',
    details:'Alunni, lezioni e risultati storici non vengono cancellati definitivamente.',
    confirmText:'Archivia classe'
  })))return;
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
  const id=$('#classId').value||null,name=$('#className').value.trim(),level=$('#classSchoolLevel').value,grade=Number($('#classGrade').value);
  const rows=$$('.student-row');
  const filledRows=rows.filter(row=>row.querySelector('.s-first').value.trim()||row.querySelector('.s-last').value.trim());
  for(const row of filledRows){if(!row.querySelector('.s-first').value.trim()||!row.querySelector('.s-last').value.trim()){msg.textContent='Completa nome e cognome di ogni alunno oppure lascia entrambe le caselle vuote.';return}}
  const f=filledRows.filter(row=>row.querySelector('.s-sex').value==='F').length;
  const m=filledRows.filter(row=>row.querySelector('.s-sex').value==='M').length;
  const total=f+m;
  if(!name||!level||!Number.isInteger(grade)){msg.textContent='Completa nome, grado scolastico e classe/anno.';return}
  const timetable=collectTimetableRows();if(!timetable.length){msg.textContent='Inserisci almeno un giorno di lezione con orario di inizio e fine.';return}for(const t of timetable){if(!t.start||!t.end||minutesBetween(t.start,t.end)<=0){msg.textContent='Controlla gli orari: ogni giorno deve avere inizio e fine validi.';return}}
  saveBtn.disabled=true;saveBtn.textContent='Salvataggio…';msg.textContent='Salvataggio della classe…';
  try{
    let cid=id;
    const classPayload={name,school_level:level,grade,female_count:f,male_count:m,student_count:total,updated_at:new Date().toISOString()};
    if(id){
      const{error}=await db.from('pe_classes').update(classPayload).eq('id',id);if(error)throw error
    }else{
      // Prima verifica se un precedente tentativo ha già creato la classe ma si è fermato dopo.
      // In quel caso recuperiamo la classe esistente e completiamo il salvataggio in modo idempotente.
      const{data:existing,error:existingErr}=await db.from('pe_classes')
        .select('id,name,archived')
        .eq('school_year_id',st.year.id)
        .eq('name',name)
        .eq('archived',false)
        .maybeSingle();
      if(existingErr)throw existingErr;
      if(existing?.id){
        cid=existing.id;
        msg.textContent='Classe già presente da un tentativo precedente: completo il salvataggio…';
        const{error:updateExistingErr}=await db.from('pe_classes').update(classPayload).eq('id',cid);
        if(updateExistingErr)throw updateExistingErr;
      }else{
        const{data,error}=await db.from('pe_classes').insert({owner_id:st.user.id,school_year_id:st.year.id,...classPayload}).select().single();
        if(error){
          if(error.code==='23505'){
            const{data:dup,error:dupErr}=await db.from('pe_classes').select('id').eq('school_year_id',st.year.id).eq('name',name).eq('archived',false).maybeSingle();
            if(dupErr)throw dupErr;
            if(!dup?.id)throw new Error('Esiste già una classe con questo nome nello stesso anno scolastico. Aprila dalla sezione Classi e modificala.');
            cid=dup.id;
            msg.textContent='Classe già esistente: completo il salvataggio su quella classe…';
            const{error:updateDupErr}=await db.from('pe_classes').update(classPayload).eq('id',cid);
            if(updateDupErr)throw updateDupErr;
          }else throw error;
        }else cid=data.id;
      }
    }

    msg.textContent='Sincronizzo gli alunni…';
    const keptIds=[];const newStudents=[];
    for(const row of rows){const sid=row.dataset.studentId,first=row.querySelector('.s-first').value.trim(),last=row.querySelector('.s-last').value.trim(),sex=row.querySelector('.s-sex').value;if(!first&&!last)continue;if(!first||!last)throw new Error('Completa nome e cognome di ogni alunno oppure lascia entrambe le caselle vuote.');if(sid){const{error}=await db.from('pe_students').update({first_name:first,last_name:last,sex,updated_at:new Date().toISOString()}).eq('id',sid);if(error)throw error;keptIds.push(sid)}else newStudents.push({owner_id:st.user.id,first_name:first,last_name:last,sex})}
    if(newStudents.length){const{data,error}=await db.from('pe_students').insert(newStudents).select('id');if(error)throw error;const enrollments=(data||[]).map(x=>({owner_id:st.user.id,student_id:x.id,class_id:cid,school_year_id:st.year.id,active:true}));if(enrollments.length){const{error:enErr}=await db.from('pe_student_enrollments').insert(enrollments);if(enErr)throw enErr}}
    const removed=classOriginalStudentIds.filter(sid=>!keptIds.includes(sid));if(id&&removed.length){const{error}=await db.from('pe_student_enrollments').update({active:false,updated_at:new Date().toISOString()}).eq('class_id',cid).in('student_id',removed);if(error)throw error}

    msg.textContent='Salvo l’orario settimanale…';await saveClassTimetable(cid,timetable);
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

function renderModules(){
  $('#moduleList').innerHTML=st.modules.slice(0,18).map(x=>`<div class="list-item module-manage-row"><div><strong>${esc(x.title)}</strong><small>${esc(x.pe_classes?.name||'')} · ${x.planned_weeks} lezioni</small></div><div class="module-manage-actions"><span class="chip">${esc(x.status)}</span><button class="btn danger small-btn" data-delete-module="${x.id}">Elimina blocco</button></div></div>`).join('')||listItem('Nessun modulo','Creane uno dal generatore');
  $$('[data-delete-module]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteModuleBlock(b.dataset.deleteModule)});
}
async function deleteModuleBlock(moduleId){
  const m=st.modules.find(x=>x.id===moduleId);if(!m)return;
  const className=m.pe_classes?.name||'Classe';
  const sportName=m.pe_sports?.name||m.title||'Modulo';
  const lessonCount=(st.lessons||[]).filter(x=>x.module_id===moduleId).length||m.planned_weeks||0;
  if(!(await appConfirm({
    icon:'🗓️',
    kicker:'ELIMINA PROGRAMMAZIONE',
    title:`Eliminare ${sportName}?`,
    message:`Classe: ${className} · ${lessonCount} ${lessonCount===1?'lezione':'lezioni'}.`,
    details:'Tutte le lezioni di questo blocco verranno eliminate anche dal calendario. Archivio esercizi e altre classi resteranno intatti.',
    confirmText:'Elimina blocco'
  })))return;
  const{error}=await db.from('pe_sport_modules').delete().eq('id',moduleId);
  if(error)return toast('Errore: '+error.message);
  toast(`Blocco ${sportName} eliminato da ${className}`);await loadCore();renderModules();renderCalendar();
}
let plannerBusy=false;
async function renderPlanTopics(){

  const sportId=$('#planSport')?.value;
  const lessonCount=Math.max(
    1,
    Number($('#planWeeks')?.value||1)
  );

  const box=$('#planTopicsList');
  const section=$('#planTopicsSection');

  if(!box || !section)return;

  if(!sportId){
    box.innerHTML='';
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  box.innerHTML=`
    <div class="plan-topics-loading">
      Carico gli argomenti…
    </div>
  `;

  const {data,error}=await db
  .from('pe_categories')
  .select('id,name,sort_order')
  .eq('sport_id',sportId)
  .order('sort_order')
  .order('name');

  if(error){
    box.innerHTML=`
      <div class="plan-topics-empty">
        Impossibile caricare gli argomenti.
      </div>
    `;
    return;
  }

  /*
   * Categorie che NON devono essere selezionabili
   * come argomento didattico.
   */
  const excluded=[
    'warm up',
    'warm-up',
    'warmup',
    'attivazione',
    'riscaldamento',
    'gioco',
    'giochi',
    'partita',
    'ssg',
    'small sided games',
    'valutazione',
    'assessment',
    'test',
    'cooldown',
    'defaticamento',
    'chiusura'
  ];

  const categories=(data||[])
  .filter(x=>x?.id && x?.name)
  .filter(x=>{
    const c=String(x.name).toLowerCase().trim();

    return !excluded.some(ex=>
      c===ex ||
      c.includes(ex)
    );
  });

  if(!categories.length){

    box.innerHTML=`
      <div class="plan-topics-empty">
        Nessun argomento disponibile per questo sport.
      </div>
    `;

    return;
  }

  /*
   * Manteniamo le scelte già effettuate
   * quando cambia il numero di lezioni.
   */
  const previous=
    [...box.querySelectorAll('.plan-topic-select')]
      .map(x=>x.value);

  box.innerHTML='';

  for(let i=0;i<lessonCount;i++){

    const row=document.createElement('div');

    row.className='plan-topic-row';

    const previousValue=previous[i]||'';

    row.innerHTML=`

      <div class="plan-topic-number">
        <span>LEZIONE</span>
        <strong>${i+1}</strong>
      </div>

      <label class="plan-topic-field">

        <span>Argomento</span>

        <select
          class="plan-topic-select"
          data-lesson-index="${i}"
          required
        >

          <option value="">
            Seleziona argomento…
          </option>

          ${categories.map(cat=>`
  <option
    value="${esc(cat.id)}"
    ${previousValue===cat.id?'selected':''}
  >
    ${esc(cat.name)}
  </option>
`).join('')}

        </select>

      </label>

    `;

    box.appendChild(row);
  }
}
$('#planSport')?.addEventListener(
  'change',
  renderPlanTopics
);

$('#planWeeks')?.addEventListener(
  'input',
  renderPlanTopics
);
async function generatePlan(){
  if(plannerBusy)return;
  const cid=$('#planClass').value,sid=$('#planSport').value,msg=$('#plannerMsg'),btn=$('#generatePlanBtn');
  if(!cid||!sid){msg.textContent='Seleziona classe e sport.';return}
  const startDate=$('#planStart').value,lessonCount=Number($('#planWeeks').value),minutes=Number($('#planMinutes').value);
  const topicSelects=[...document.querySelectorAll('.plan-topic-select')];

if(topicSelects.length!==lessonCount){
  msg.textContent='Controlla gli argomenti delle lezioni.';
  return;
}

const lessonTopics=topicSelects.map((select,index)=>({
  lesson_no:index+1,
  category_id:select.value
}));

if(lessonTopics.some(x=>!x.category_id)){
  msg.textContent='Scegli un argomento per ogni lezione.';
  return;
}
  if(!startDate||!lessonCount||lessonCount<1||!minutes){msg.textContent='Completa data di partenza, numero di lezioni e durata.';return}
  plannerBusy=true;if(btn){btn.disabled=true;btn.textContent='Generazione in corso…'}
  let moduleId=null;
  try{
    const sp=st.sports.find(x=>x.id===sid),cl=st.classes.find(x=>x.id===cid);
    msg.textContent='Controllo giorni e orari della classe…';
    const{data:slots,error:slotErr}=await db.from('pe_class_timetable_slots').select('id,weekday,start_time,end_time').eq('class_id',cid).eq('active',true);
    if(slotErr)throw slotErr;
    if(!(slots||[]).length)throw new Error('Dati insufficienti: questa classe non ha giorni e orari di lezione. Apri Classi → modifica → Orario settimanale.');
    msg.textContent='Creo il modulo…';
    const{data:m,error}=await db.from('pe_sport_modules').insert({owner_id:st.user.id,class_id:cid,sport_id:sid,module_type:'automatic',title:`${sp.name} · ${cl.name}`,start_date:startDate,planned_weeks:lessonCount,lesson_duration_min:minutes,level_override:$('#planLevel').value?+$('#planLevel').value:null,progression_mode:'progressive',status:'planned'}).select().single();
    if(error)throw error;moduleId=m.id;
    msg.textContent='Salvo gli argomenti delle lezioni…';

const topicsPayload=lessonTopics.map(topic=>({
  owner_id:st.user.id,
  module_id:m.id,
  lesson_no:topic.lesson_no,
  category_id:topic.category_id
}));

const {error:topicsError}=await db
  .from('pe_module_lesson_topics')
  .insert(topicsPayload);

if(topicsError){
  throw topicsError;
}
    msg.textContent='Scelgo attività reali dall’archivio e costruisco la progressione…';
    const{data:generated,error:er}=await db.rpc('pe_generate_module_plan',{p_module_id:m.id,p_regenerate:false});
    if(er)throw er;
    try{await applyTimetableTimesToModule(m.id,cid)}catch(timeErr){console.warn('Orari modulo non applicati',timeErr)}
    msg.textContent=`Programmazione creata: ${generated?.generated_lessons||lessonCount} lezioni complete, progressive e collegate all’archivio verificato.`;
    toast('Programmazione generata');await loadCore();renderCalendar();renderModules();
  }catch(err){
    console.error('Generazione modulo',err);
    if(moduleId)try{await db.from('pe_sport_modules').delete().eq('id',moduleId)}catch(_e){}
    msg.textContent='Errore: '+(err?.message||'generazione non riuscita');toast('Programmazione non generata');
  }finally{plannerBusy=false;if(btn){btn.disabled=false;btn.textContent='✦ Genera programmazione'}}
}
$('#plannerForm').onsubmit=e=>{e.preventDefault();generatePlan()};
$('#generatePlanBtn').onclick=e=>{e.preventDefault();generatePlan()};
let replaceCtx=null;
function primaryMarker(ref=''){const m=String(ref||'').match(/PRIMARY_GAME:(BOOK:(\d+)|CUSTOM:([0-9a-f-]+))/i);if(!m)return null;return m[2]?`book-${m[2]}`:m[3]}
async function openLesson(id){let{data:l,error:lessonErr}=await db.from('pe_lessons').select('*,pe_classes!pe_lessons_class_id_fkey(name),pe_sports(id,name)').eq('id',id).single(),{data:it,error:itemErr}=await db.from('pe_lesson_exercises').select('*,pe_exercises!pe_lesson_exercises_exercise_id_fkey(*)').eq('lesson_id',id).order('order_no');if(lessonErr)return toast(lessonErr.message);if(itemErr)return toast(itemErr.message);$('#lessonModalTitle').textContent=l.title;const when=l.start_time?`${String(l.start_time).slice(0,5)}${l.end_time?'–'+String(l.end_time).slice(0,5):''}`:'';$('#lessonBody').innerHTML=`<div class="lesson-summary-hero"><div><span class="kicker">LEZIONE PROGRAMMATA</span><h4>${esc(l.pe_sports?.name||'Educazione fisica')}</h4><p>${esc(l.learning_goal||'Progressione didattica generata dall’archivio verificato.')}</p></div><div class="lesson-summary-chips"><span class="chip">${esc(l.pe_classes?.name)}</span><span class="chip">${fmt(l.lesson_date)}</span>${when?`<span class="chip">${when}</span>`:''}<span class="chip good">${l.duration_min}' totali</span></div></div><div class="lesson-timeline">${(it||[]).map(x=>{const pm=primaryMarker(x.primary_game_ref),ex=x.pe_exercises;const clickable=x.exercise_id||pm;return`<div class="lesson-row ${clickable?'lesson-row-clickable':''}" ${x.exercise_id?`data-card-ex="${x.exercise_id}"`:pm?`data-card-primary="${pm}"`:''}><div class="lesson-time">${x.duration_min}'</div><div><span class="kicker">${phaseLabel[x.phase]||x.phase}</span><strong>${esc(x.custom_title||ex?.name||'Attività')}</strong><p>${esc(x.custom_explanation||ex?.student_explanation||'')}</p><div class="category-pills">${ex?.difficulty?`<span class="chip">Liv. ${ex.difficulty}/5</span>`:''}${ex?.field_dimensions?`<span class="chip">Campo ${esc(ex.field_dimensions)}</span>`:''}${x.station_count?`<span class="chip">${x.station_count} campi/stazioni</span><span class="chip">${x.players_per_group} alunni/gruppo</span>`:''}</div>${x.selection_reason?`<small class="selection-reason">✦ ${esc(x.selection_reason)}</small>`:''}</div><div class="lesson-actions">${x.exercise_id?`<button class="btn secondary small-btn" data-open-ex="${x.exercise_id}">Apri scheda</button>`:pm?`<button class="btn secondary small-btn" data-open-primary="${pm}">Apri scheda</button>`:''}<button class="btn primary small-btn" data-replace-item="${x.id}">Cambia</button></div></div>`}).join('')}</div><div class="lesson-management"><span class="kicker">GESTISCI LEZIONE</span><div class="lesson-management-grid"><button class="btn secondary" id="moveLessonBtn">📅 Sposta a data scelta</button>${l.module_id?`<button class="btn secondary" id="shiftLessonBtn">↪ Slitta questa e le successive</button>`:''}<button class="btn danger" id="deleteLessonBtn">🗑 Elimina lezione</button></div><small class="muted">Spostamento ed eliminazione mantengono intatti gli esercizi delle altre lezioni. Lo slittamento usa le prossime giornate utili dell’orario della classe.</small></div>`;$$('[data-open-ex]').forEach(b=>b.onclick=e=>{e.stopPropagation();openExercise(b.dataset.openEx)});$$('[data-open-primary]').forEach(b=>b.onclick=async e=>{e.stopPropagation();await loadPrimaryGames();openPrimaryGame(b.dataset.openPrimary)});$$('[data-card-ex]').forEach(r=>r.onclick=e=>{if(e.target.closest('button'))return;openExercise(r.dataset.cardEx)});$$('[data-card-primary]').forEach(r=>r.onclick=async e=>{if(e.target.closest('button'))return;await loadPrimaryGames();openPrimaryGame(r.dataset.cardPrimary)});$$('[data-replace-item]').forEach(b=>b.onclick=e=>{e.stopPropagation();startReplacement(b.dataset.replaceItem,l,it||[])});
  const mv=$('#moveLessonBtn'),sh=$('#shiftLessonBtn'),dl=$('#deleteLessonBtn');
  if(mv)mv.onclick=()=>moveLessonToChosenDate(l);
  if(sh)sh.onclick=()=>shiftLessonChain(l);
  if(dl)dl.onclick=()=>deleteSingleLesson(l);
  $('#lessonModal').showModal()}

async function deleteSingleLesson(lesson){
  const extra=lesson.module_id?'Le lezioni successive del blocco verranno rinumerate automaticamente.':'La lezione verrà rimossa dal calendario.';
  if(!(await appConfirm({
    icon:'🗑️',
    kicker:'ELIMINA LEZIONE',
    title:`Eliminare “${lesson.title}”?`,
    message:`Data: ${fmt(lesson.lesson_date)}`,
    details:extra,
    confirmText:'Elimina lezione'
  })))return;
  const{data,error}=await db.rpc('pe_delete_lesson_and_compact',{p_lesson_id:lesson.id});
  if(error)return toast('Errore: '+error.message);
  $('#lessonModal').close();toast('Lezione eliminata');await loadCore();renderCalendar();renderModules();
}
async function moveLessonToChosenDate(lesson){

  const modal=document.createElement('dialog');
  modal.className='modal move-lesson-date-modal';

  modal.innerHTML=`
    <div class="modal-head">
      <div>
        <span class="kicker">SPOSTA LEZIONE</span>
        <h3>Scegli la nuova data</h3>
      </div>

      <button
        type="button"
        class="move-date-close"
        aria-label="Chiudi"
      >×</button>
    </div>

    <div class="move-date-content">

      <div class="move-date-icon">📅</div>

      <p>
        Seleziona dal calendario il giorno in cui vuoi svolgere
        <strong>${esc(lesson.title||'questa lezione')}</strong>.
      </p>

      <label class="move-date-field">
        Nuova data
        <input
          id="moveLessonDateInput"
          type="date"
          value="${esc(lesson.lesson_date||'')}"
          min="${esc(st.year?.start_date||'')}"
          max="${esc(st.year?.end_date||'')}"
        >
      </label>

      <div class="move-date-current">
        <span>Data attuale</span>
        <strong>${fmt(lesson.lesson_date)}</strong>
      </div>

      <div class="move-date-actions">
        <button
          type="button"
          class="btn secondary move-date-cancel"
        >
          Annulla
        </button>

        <button
          type="button"
          class="btn primary move-date-confirm"
        >
          Continua
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const close=()=>{
    try{modal.close()}catch{}
    modal.remove();
  };

  modal.querySelector('.move-date-close').onclick=close;
  modal.querySelector('.move-date-cancel').onclick=close;

  modal.oncancel=e=>{
    e.preventDefault();
    close();
  };

  modal.querySelector('.move-date-confirm').onclick=async()=>{

    const date=modal.querySelector('#moveLessonDateInput').value;

    if(!date){
      toast('Seleziona una nuova data');
      return;
    }

    if(date===lesson.lesson_date){
      toast('Hai selezionato la stessa data');
      return;
    }

    /*
     * Controlliamo se questa lezione appartiene a un modulo
     * e se esistono lezioni successive dello stesso modulo.
     */
    let hasFollowingLessons=false;
    let followingCount=0;

    if(lesson.module_id){

      const {data:following,error:followingError}=await db
        .from('pe_lessons')
        .select('id,sequence_no')
        .eq('module_id',lesson.module_id)
        .gt('sequence_no',lesson.sequence_no);

      if(followingError){
        toast('Errore nel controllo delle lezioni successive');
        return;
      }

      followingCount=(following||[]).length;
      hasFollowingLessons=followingCount>0;
    }

    /*
     * Se è l'ultima lezione del modulo,
     * non serve chiedere nulla:
     * spostiamo soltanto questa.
     */
    if(!hasFollowingLessons){

      const btn=modal.querySelector('.move-date-confirm');

      btn.disabled=true;
      btn.textContent='Spostamento…';

      const {error}=await db.rpc(
        'pe_move_lesson_date',
        {
          p_lesson_id:lesson.id,
          p_new_date:date
        }
      );

      if(error){
        btn.disabled=false;
        btn.textContent='Continua';
        toast('Errore: '+error.message);
        return;
      }

      close();

      $('#lessonModal').close();

      toast('Lezione spostata');

      await loadCore();

      renderCalendar();
      renderModules();

      return;
    }

    /*
     * Ci sono lezioni successive.
     * Chiudiamo il calendario e chiediamo cosa fare.
     */
    close();

    const choiceModal=document.createElement('dialog');
    choiceModal.className='modal move-chain-choice-modal';

    choiceModal.innerHTML=`
      <div class="modal-head">
        <div>
          <span class="kicker">GESTISCI LA PROGRESSIONE</span>
          <h3>Come vuoi spostare la lezione?</h3>
        </div>

        <button
          type="button"
          class="move-chain-close"
          aria-label="Chiudi"
        >×</button>
      </div>

      <div class="move-chain-content">

        <div class="move-chain-icon">↪</div>

        <p>
          Dopo questa lezione ci sono ancora
          <strong>
            ${followingCount}
            ${followingCount===1?'lezione':'lezioni'}
          </strong>
          dello stesso modulo.
        </p>

        <p class="move-chain-question">
          Vuoi modificare solamente questa data oppure
          ripianificare automaticamente anche le successive?
        </p>

        <div class="move-chain-options">

          <button
            type="button"
            class="move-chain-option move-only-one"
          >
            <span class="move-option-icon">📅</span>

            <span class="move-option-copy">
              <strong>Sposta solo questa</strong>
              <small>
                Le altre lezioni manterranno le date attuali.
              </small>
            </span>

            <span class="move-option-arrow">→</span>
          </button>

          <button
            type="button"
            class="move-chain-option recommended move-all-next"
          >
            <span class="move-option-icon">↪</span>

            <span class="move-option-copy">
              <strong>Questa e le successive</strong>
              <small>
                AttivaMente ripianificherà le lezioni successive
                sulle prossime giornate utili della classe.
              </small>
            </span>

            <span class="move-option-arrow">→</span>
          </button>

        </div>

        <div class="move-chain-date-summary">
          <span>Nuova data scelta</span>
          <strong>${fmt(date)}</strong>
        </div>

        <button
          type="button"
          class="btn ghost move-chain-cancel"
        >
          Annulla
        </button>

      </div>
    `;

    document.body.appendChild(choiceModal);

    const closeChoice=()=>{
      try{choiceModal.close()}catch{}
      choiceModal.remove();
    };

    choiceModal.querySelector('.move-chain-close').onclick=closeChoice;
    choiceModal.querySelector('.move-chain-cancel').onclick=closeChoice;

    choiceModal.oncancel=e=>{
      e.preventDefault();
      closeChoice();
    };

    /*
     * OPZIONE 1
     * Sposta soltanto questa lezione.
     */
    choiceModal.querySelector('.move-only-one').onclick=async()=>{

      const buttons=choiceModal.querySelectorAll('button');

      buttons.forEach(b=>b.disabled=true);

      const {error}=await db.rpc(
        'pe_move_lesson_date',
        {
          p_lesson_id:lesson.id,
          p_new_date:date
        }
      );

      if(error){
        buttons.forEach(b=>b.disabled=false);
        toast('Errore: '+error.message);
        return;
      }

      closeChoice();

      $('#lessonModal').close();

      toast('Lezione spostata');

      await loadCore();

      renderCalendar();
      renderModules();
    };

    /*
     * OPZIONE 2
     * Sposta questa e ripianifica tutte le successive
     * dello stesso modulo.
     */
    choiceModal.querySelector('.move-all-next').onclick=async()=>{

      const buttons=choiceModal.querySelectorAll('button');

      buttons.forEach(b=>b.disabled=true);

      const selected=
        choiceModal.querySelector('.move-all-next strong');

      if(selected){
        selected.textContent='Ripianificazione…';
      }

      const {data,error}=await db.rpc(
        'pe_move_lesson_chain_to_date',
        {
          p_lesson_id:lesson.id,
          p_new_date:date
        }
      );

      if(error){

        buttons.forEach(b=>b.disabled=false);

        if(selected){
          selected.textContent='Questa e le successive';
        }

        toast('Errore: '+error.message);

        return;
      }

      closeChoice();

      $('#lessonModal').close();

      toast(
        `${data?.moved_lessons||followingCount+1} lezioni ripianificate`
      );

      await loadCore();

      renderCalendar();
      renderModules();
    };

    choiceModal.showModal();
  };

  modal.showModal();

  const input=modal.querySelector('#moveLessonDateInput');

  setTimeout(()=>{
    try{
      input.showPicker?.();
    }catch{}
  },150);
}
async function shiftLessonChain(lesson){
  const raw=prompt('Di quante occasioni di lezione vuoi slittare questa lezione e tutte le successive?','1');
  if(raw===null)return;const n=parseInt(raw,10);
  if(!Number.isInteger(n)||n<1||n>20){toast('Inserisci un numero da 1 a 20');return}
  if(!(await appConfirm({
    icon:'↪️',
    kicker:'SPOSTA PROGRAMMAZIONE',
    title:`Slittare di ${n} ${n===1?'lezione utile':'lezioni utili'}?`,
    message:`“${lesson.title}” e tutte le lezioni successive verranno spostate in avanti.`,
    details:'Ordine, esercizi e progressione resteranno invariati.',
    confirmText:'Slitta lezioni',
    danger:false
  })))return;
  const{data,error}=await db.rpc('pe_shift_lesson_chain',{p_lesson_id:lesson.id,p_slots:n});
  if(error)return toast('Errore: '+error.message);
  $('#lessonModal').close();toast('Lezioni slittate mantenendo l’ordine');await loadCore();renderCalendar();renderModules();
}

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
function isOwner(){return st.user?.app_metadata?.app_role==='owner'||st.user?.app_metadata?.is_owner===true}
function numOrNull(v){return v===''||v===null||v===undefined?null:Number(v)}
function textOrNull(v){const s=String(v??'').trim();return s||null}
function exerciseDetailHTML(e){const box=(t,v)=>`<div class="detail-box"><b>${t}</b><p>${esc(v||'—')}</p></div>`;return `<div class="category-pills"><span class="chip">${esc(e.pe_categories?.name||'')}</span><span class="chip">Livello ${e.difficulty||'—'}</span><span class="chip">${e.duration_min||'—'}–${e.duration_max||'—'}'</span><span class="chip">${esc(e.field_dimensions||'')}</span></div><div class="detail-grid" style="margin-top:12px">${box('COSA DEVI FARE',e.student_explanation)}${box('SPIEGAZIONE DOCENTE',e.teacher_explanation)}${box('OBIETTIVO',e.objective)}${box('ORGANIZZAZIONE',e.organization)}${box('REGOLE',e.rules)}${box('VARIANTI',e.variants)}${box('FACILITAZIONI',e.regressions)}${box('PROGRESSIONI',e.progressions)}${box('ERRORI',e.common_errors)}${box('CORREZIONI',e.corrections)}${box('CUE DOCENTE',e.teacher_cues)}${box('SICUREZZA',e.safety_notes)}</div>${isOwner()?`<div style="margin-top:16px;display:flex;justify-content:flex-end"><button id="editExerciseOwnerBtn" class="btn primary">✏️ Modifica esercizio</button></div>`:''}`}
async function renderExerciseEditor(e){if(!isOwner())return;const{data:cats,error}=await db.from('pe_categories').select('id,name').eq('sport_id',e.sport_id).order('sort_order').order('name');if(error)return toast(error.message);const val=v=>esc(v??'');const opt=(n,label)=>`<option value="${n}" ${Number(e.difficulty)===n?'selected':''}>${label}</option>`;const scoreSelect=(id,label,value)=>`<label>${label}<select id="${id}"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(value)===n?'selected':''}>${n}</option>`).join('')}</select></label>`;$('#exerciseModalTitle').textContent=`Modifica · ${e.name}`;$('#exerciseModalBody').innerHTML=`<form id="ownerExerciseForm" style="display:grid;gap:14px">
<div class="form-row"><label>Nome esercizio<input id="oeName" value="${val(e.name)}" required></label><label>Categoria<select id="oeCategory"><option value="">Nessuna categoria</option>${(cats||[]).map(c=>`<option value="${c.id}" ${e.category_id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label></div>
<label>Spiegazione per l'alunno<textarea id="oeStudent" rows="4">${val(e.student_explanation)}</textarea></label>
<label>Spiegazione docente<textarea id="oeTeacher" rows="4">${val(e.teacher_explanation)}</textarea></label>
<div class="form-row"><label>Obiettivo<textarea id="oeObjective" rows="3">${val(e.objective)}</textarea></label><label>Organizzazione<textarea id="oeOrganization" rows="3">${val(e.organization)}</textarea></label></div>
<div class="form-row"><label>Regole<textarea id="oeRules" rows="3">${val(e.rules)}</textarea></label><label>Varianti<textarea id="oeVariants" rows="3">${val(e.variants)}</textarea></label></div>
<div class="form-row"><label>Facilitazioni<textarea id="oeRegressions" rows="3">${val(e.regressions)}</textarea></label><label>Progressioni<textarea id="oeProgressions" rows="3">${val(e.progressions)}</textarea></label></div>
<div class="form-row"><label>Errori comuni<textarea id="oeErrors" rows="3">${val(e.common_errors)}</textarea></label><label>Correzioni<textarea id="oeCorrections" rows="3">${val(e.corrections)}</textarea></label></div>
<div class="form-row"><label>Cue docente<textarea id="oeCues" rows="3">${val(e.teacher_cues)}</textarea></label><label>Sicurezza<textarea id="oeSafety" rows="3">${val(e.safety_notes)}</textarea></label></div>
<div class="form-row"><label>Durata minima (min)<input id="oeDurationMin" type="number" min="1" max="120" value="${val(e.duration_min)}"></label><label>Durata massima (min)<input id="oeDurationMax" type="number" min="1" max="240" value="${val(e.duration_max)}"></label></div>
<div class="form-row"><label>Dimensioni campo<input id="oeField" value="${val(e.field_dimensions)}" placeholder="es. 20×15 m"></label><label>Materiali (separati da virgola)<input id="oeEquipment" value="${val(Array.isArray(e.equipment)?e.equipment.join(', '):'')}"></label></div>
<div class="form-row"><label>Giocatori minimi<input id="oeMinPlayers" type="number" min="1" value="${val(e.min_players)}"></label><label>Giocatori massimi<input id="oeMaxPlayers" type="number" min="1" value="${val(e.max_players)}"></label></div>
<div class="form-row"><label>Età minima<input id="oeAgeMin" type="number" min="3" max="99" value="${val(e.age_min)}"></label><label>Età massima<input id="oeAgeMax" type="number" min="3" max="99" value="${val(e.age_max)}"></label></div>
<div class="form-row"><label>Difficoltà<select id="oeDifficulty"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(e.difficulty)===n?'selected':''}>${n}</option>`).join('')}</select></label>${scoreSelect('oeIntensity','Intensità',e.intensity)}</div>
<div class="form-row">${scoreSelect('oeFun','Divertimento',e.fun_score)}${scoreSelect('oeDecision','Decision making',e.decision_making)}</div>
<div class="form-row">${scoreSelect('oeOrgScore','Organizzazione',e.organization_score)}${scoreSelect('oeIdle','Tempo morto',e.idle_time)}</div>
<div class="form-row"><label>Stato audit<select id="oeAudit"><option value="VERIFIED" ${e.audit_status==='VERIFIED'?'selected':''}>VERIFIED</option><option value="PENDING" ${e.audit_status==='PENDING'?'selected':''}>PENDING</option><option value="NEEDS_REVIEW" ${e.audit_status==='NEEDS_REVIEW'?'selected':''}>NEEDS_REVIEW</option></select></label><label>Attivo<select id="oeActive"><option value="true" ${e.active!==false?'selected':''}>Sì</option><option value="false" ${e.active===false?'selected':''}>No</option></select></label></div>
<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button id="cancelExerciseEdit" type="button" class="btn secondary">Annulla</button><button type="submit" class="btn primary">💾 Salva modifiche</button></div>
<small id="ownerExerciseMsg"></small></form>`;
$('#cancelExerciseEdit').onclick=()=>openExercise(e.id);
$('#ownerExerciseForm').onsubmit=async ev=>{ev.preventDefault();if(!isOwner())return toast('Accesso OWNER richiesto');const msg=$('#ownerExerciseMsg');msg.textContent='Salvataggio…';const equipment=$('#oeEquipment').value.split(',').map(x=>x.trim()).filter(Boolean);const payload={name:$('#oeName').value.trim(),category_id:$('#oeCategory').value||null,student_explanation:textOrNull($('#oeStudent').value)||'',teacher_explanation:textOrNull($('#oeTeacher').value)||'',objective:textOrNull($('#oeObjective').value),organization:textOrNull($('#oeOrganization').value),rules:textOrNull($('#oeRules').value),variants:textOrNull($('#oeVariants').value),regressions:textOrNull($('#oeRegressions').value),progressions:textOrNull($('#oeProgressions').value),common_errors:textOrNull($('#oeErrors').value),corrections:textOrNull($('#oeCorrections').value),teacher_cues:textOrNull($('#oeCues').value),safety_notes:textOrNull($('#oeSafety').value),duration_min:numOrNull($('#oeDurationMin').value),duration_max:numOrNull($('#oeDurationMax').value),field_dimensions:textOrNull($('#oeField').value),equipment:equipment.length?equipment:null,min_players:numOrNull($('#oeMinPlayers').value),max_players:numOrNull($('#oeMaxPlayers').value),age_min:numOrNull($('#oeAgeMin').value),age_max:numOrNull($('#oeAgeMax').value),difficulty:numOrNull($('#oeDifficulty').value),intensity:numOrNull($('#oeIntensity').value),fun_score:numOrNull($('#oeFun').value),decision_making:numOrNull($('#oeDecision').value),organization_score:numOrNull($('#oeOrgScore').value),idle_time:numOrNull($('#oeIdle').value),audit_status:$('#oeAudit').value,active:$('#oeActive').value==='true',updated_at:new Date().toISOString()};if(!payload.name){msg.textContent='Inserisci il nome dell’esercizio.';return}const{error}=await db.from('pe_exercises').update(payload).eq('id',e.id);if(error){console.error(error);msg.textContent=error.message;toast('Modifica non salvata');return}toast('Esercizio aggiornato');await loadExercises();await openExercise(e.id)};
}
async function openExercise(id){let{data:e,error}=await db.from('pe_exercises').select('*,pe_categories(name)').eq('id',id).single();if(error)return toast(error.message);$('#exerciseModalTitle').textContent=e.name;$('#exerciseModalBody').innerHTML=exerciseDetailHTML(e);$('#exerciseModal').showModal();const edit=$('#editExerciseOwnerBtn');if(edit)edit.onclick=()=>renderExerciseEditor(e)}
function renderTests(){$('#testsGrid').innerHTML=st.tests.map(t=>`<article class="test-card"><h4>${esc(t.name)}</h4><p>Unità: ${esc(t.unit)}</p><div class="test-direction">${t.result_direction==='lower_better'?'↓ MIGLIORE IL VALORE PIÙ BASSO':'↑ MIGLIORE IL VALORE PIÙ ALTO'}</div></article>`).join('');loadHof()}
$('#newTestBtn').onclick=()=>$('#testModal').showModal();
$('#testForm').onsubmit=async e=>{e.preventDefault();const slug=$('#testName').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now();let{error}=await db.from('pe_motor_tests').insert({owner_id:st.user.id,name:$('#testName').value,slug,unit:$('#testUnit').value,result_direction:$('#testDirection').value,is_default:false,active:true});if(error)return toast(error.message);$('#testModal').close();toast('Test creato');await loadCore()}
$$('[data-testtab]').forEach(b=>b.onclick=()=>{$$('[data-testtab]').forEach(x=>x.classList.toggle('active',x===b));$$('.testtab').forEach(x=>x.classList.toggle('active',x.id===`testtab-${b.dataset.testtab}`));if(b.dataset.testtab==='rankings')loadRankings();if(b.dataset.testtab==='hof')loadHof()});
$('#sessionForm').onsubmit=async e=>{e.preventDefault();if(!requireSchoolYear('Crea prima l’anno scolastico per registrare i test.'))return;const cid=$('#sessionClass').value,tid=$('#sessionTest').value,date=$('#sessionDate').value;if(!cid||!tid)return;let test=st.tests.find(x=>x.id===tid);let{data:ses,error}=await db.from('pe_motor_test_sessions').insert({owner_id:st.user.id,school_year_id:st.year.id,class_id:cid,test_id:tid,session_date:date,title:test.name}).select().single();if(error)return toast(error.message);renderResultEntry(ses,test,cid)}
async function renderResultEntry(session,test,cid){let{data:en}=await db.from('pe_student_enrollments').select('student_id,pe_students!pe_student_enrollments_student_id_fkey(*)').eq('class_id',cid).eq('active',true);$('#sessionResultsArea').innerHTML=`<div class="panel glass" style="margin-top:14px"><span class="kicker">${esc(test.name)}</span><h3>Inserisci risultati</h3><div id="resultRows">${(en||[]).map(x=>`<div class="ranking-row"><div>${x.pe_students.sex==='F'?'♀':'♂'}</div><div><strong>${esc(x.pe_students.first_name)} ${esc(x.pe_students.last_name)}</strong></div><input style="max-width:120px" type="number" step="0.01" data-result-student="${x.student_id}" placeholder="${esc(test.unit)}"></div>`).join('')}</div><button id="saveResults" class="btn primary" style="margin-top:12px">Salva risultati</button></div>`;$('#saveResults').onclick=async()=>{const rows=[];$$('[data-result-student]').forEach(i=>{if(i.value!=='')rows.push({owner_id:st.user.id,session_id:session.id,student_id:i.dataset.resultStudent,result_value:+i.value})});if(rows.length){let{error}=await db.from('pe_motor_test_results').insert(rows);if(error)return toast(error.message)}toast('Risultati salvati');await loadCore();loadRankings()}}
function avg(values){const nums=(values||[]).map(Number).filter(Number.isFinite);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null}
function fmtNum(v,d=2){if(v===null||v===undefined||!Number.isFinite(Number(v)))return '—';return Number(v).toLocaleString('it-IT',{maximumFractionDigits:d})}
function testEmoji(name=''){const n=String(name).toLowerCase();if(/sprint|corsa|veloc|cooper|navetta|beep|yo-yo/.test(n))return '🏃';if(/salto|jump|cmj|lungo|alto/.test(n))return '🦘';if(/lancio|palla medica|peso|throw/.test(n))return '🥎';if(/forza|push|plank|core|traz|grip|presa|addom/.test(n))return '💪';if(/equilibr|balance/.test(n))return '⚖️';if(/fless|mobil|sit and reach/.test(n))return '🧘';if(/agilit|t-test|505|shuttle/.test(n))return '⚡';if(/corda|rope/.test(n))return '🪢';if(/resist|endurance/.test(n))return '❤️';return '🏅'}
function metricCard(icon,label,value,detail,cls=''){return `<article class="simple-metric ${cls}"><span class="simple-metric-icon">${icon}</span><div><small>${esc(label)}</small><b>${value}</b><em>${esc(detail||'')}</em></div></article>`}
function emptyPremium(label='Nessun risultato disponibile'){return `<div class="empty-premium"><div class="empty-icon">🏁</div><strong>${esc(label)}</strong><div class="muted" style="margin-top:5px">Inserisci nuovi rilevamenti per popolare questa sezione.</div></div>`}
function podiumHTML(rows,mode='result',emoji='🏆'){if(!rows?.length)return '';const top=rows.slice(0,3);return `<div class="simple-podium-head"><span>🏆</span><strong>Podio</strong></div><div class="simple-podium-grid">${top.map((x,i)=>`<article class="simple-podium-card p${i+1}"><div class="simple-medal">${['🥇','🥈','🥉'][i]}</div><strong>${esc(x.first_name)} ${esc(x.last_name)}</strong><b>${mode==='total'?`${x.total_points} pt`:`${fmtNum(x.result_value)} ${esc(x.unit||'')}`}</b><small>${i+1}° posto</small></article>`).join('')}</div>`}
function rankingRows(rows,mode='result',mean=null,direction='higher_better'){return (rows||[]).map((x,i)=>{const place=mode==='total'?x.total_place:x.place,val=mode==='total'?Number(x.total_points):Number(x.result_value),unit=mode==='total'?'pt':x.unit||'',diff=mean===null?null:val-mean;const medal=place===1?'🥇':place===2?'🥈':place===3?'🥉':`${place}°`;let comparison='';if(diff!==null){const good=mode==='total'?diff>=0:(direction==='lower_better'?diff<=0:diff>=0);comparison=`<small class="simple-compare ${good?'good':'muted'}">${diff===0?'= media':`${diff>0?'+':''}${fmtNum(diff)} dalla media`}</small>`}return `<div class="simple-rank-row ${place<=3?'top':''}"><div class="simple-rank-place">${medal}</div><div class="simple-rank-name"><strong>${esc(x.first_name)} ${esc(x.last_name)}</strong><small>${mode==='total'?`${x.scored_results} prove a punti`:esc(x.test_name||'Test motorio')}</small></div><div class="simple-rank-result"><b>${fmtNum(val)} ${esc(unit)}</b>${comparison}</div></div>`}).join('')}
function recomputeGeneralResultRank(rows,direction){
  const sorted=[...(rows||[])].sort((a,b)=>direction==='lower_better'?Number(a.result_value)-Number(b.result_value):Number(b.result_value)-Number(a.result_value));
  let prev=null,place=0;return sorted.map((x,i)=>{const v=Number(x.result_value);if(prev===null||v!==prev)place=i+1;prev=v;return{...x,place,points:Math.max(0,6-place)}})
}
function recomputeGeneralTotalRank(rows){
  const sorted=[...(rows||[])].sort((a,b)=>Number(b.total_points)-Number(a.total_points));let prev=null,place=0;
  return sorted.map((x,i)=>{const v=Number(x.total_points);if(prev===null||v!==prev)place=i+1;prev=v;return{...x,total_place:place}})
}
async function loadRankings(){
  const cid=$('#rankingClass').value||st.classes[0]?.id,sex=$('#rankingSex').value||'',tid=$('#rankingTest').value||'';if(!cid)return;
  const chosenTest=tid?st.tests.find(x=>x.id===tid):null,chosenEmoji=testEmoji(chosenTest?.name||'');
  $('#rankingOverview').innerHTML=metricCard('⏳','Caricamento','…','Preparo la classifica','');$('#rankingPodium').innerHTML='';

  let tq=db.from('pe_motor_test_total_rankings').select('*').eq('class_id',cid);if(sex)tq=tq.eq('sex',sex);let{data:t,error:te}=await tq.order('total_points',{ascending:false});if(te){toast(te.message);t=[]}t=t||[];if(!sex)t=recomputeGeneralTotalRank(t);else t.sort((a,b)=>Number(a.total_place)-Number(b.total_place));
  const pointsAvg=avg(t.map(x=>x.total_points));
  $('#totalRankingMeta').textContent=t.length?`${t.length} alunni`:'Nessun dato';$('#totalRanking').innerHTML=t.length?rankingRows(t,'total',pointsAvg,'higher_better'):emptyPremium('Classifica generale ancora vuota');

  let sq=db.from('pe_motor_test_sessions').select('id,test_id,session_date,title').eq('class_id',cid);if(tid)sq=sq.eq('test_id',tid);let{data:sess,error:se}=await sq.order('session_date',{ascending:false}).limit(1);if(se){toast(se.message);sess=[]}
  if(!sess?.length){
    const groupLabel=sex==='F'?'Femmine':sex==='M'?'Maschi':'Classe intera';
    $('#singleRanking').innerHTML=emptyPremium(tid?'Nessuna rilevazione di questo test per la classe':'Nessun test registrato');$('#singleRankingTitle').textContent=tid?`${chosenEmoji} ${chosenTest?.name||'Classifica test'}`:'🏅 Classifica test';$('#singleRankingMeta').textContent='—';
    $('#rankingOverview').innerHTML=[metricCard('👥','Partecipanti',t.length||'—',groupLabel),metricCard('📊','Media punti',pointsAvg===null?'—':fmtNum(pointsAvg,1),'classifica generale'),metricCard('🏆','Primo posto',t[0]?`${t[0].total_points} pt`:'—',t[0]?`${t[0].first_name} ${t[0].last_name}`:'Nessun dato')].join('');$('#rankingPodium').innerHTML=podiumHTML(t,'total','🏆');return
  }
  const latest=sess[0];let rq=db.from('pe_motor_test_rankings').select('*').eq('session_id',latest.id);if(sex)rq=rq.eq('sex',sex);let{data:r,error:re}=await rq;if(re){toast(re.message);r=[]}r=r||[];
  const direction=r[0]?.result_direction||st.tests.find(x=>x.id===latest.test_id)?.result_direction||'higher_better';if(!sex)r=recomputeGeneralResultRank(r,direction);else r.sort((a,b)=>Number(a.place)-Number(b.place));
  const testMean=avg(r.map(x=>x.result_value)),best=r[0],testName=r[0]?.test_name||latest.title||'Test',unit=r[0]?.unit||st.tests.find(x=>x.id===latest.test_id)?.unit||'',emoji=testEmoji(testName);
  $('#singleRankingTitle').textContent=`${emoji} ${testName}`;$('#singleRankingMeta').textContent=new Date(latest.session_date+'T12:00:00').toLocaleDateString('it-IT');$('#singleRanking').innerHTML=r.length?rankingRows(r,'result',testMean,direction):emptyPremium('Nessun risultato nella selezione');$('#rankingPodium').innerHTML=podiumHTML(r.length?r:t,r.length?'result':'total',emoji);
  const groupLabel=sex==='F'?'Femmine':sex==='M'?'Maschi':'Classe intera';
  $('#rankingOverview').innerHTML=[metricCard('👥','Partecipanti',r.length,groupLabel),metricCard('📊','Media classe',testMean===null?'—':`${fmtNum(testMean)} ${unit}`,testName),metricCard(emoji,'Miglior risultato',best?`${fmtNum(best.result_value)} ${unit}`:'—',best?`${best.first_name} ${best.last_name}`:'Nessun dato')].join('');
}
$('#rankingClass').onchange=loadRankings;$('#rankingTest').onchange=loadRankings;$('#rankingSex').onchange=loadRankings;
async function loadHof(){let q=db.from('pe_motor_test_hall_of_fame').select('*');if($('#hofTest').value)q=q.eq('test_id',$('#hofTest').value);if($('#hofSex').value)q=q.eq('sex',$('#hofSex').value);let{data,error}=await q.limit(100);if(error){toast(error.message);data=[]}data=data||[];
  const tests=new Set(data.map(x=>x.test_id)).size,years=new Set(data.map(x=>x.school_year_label).filter(Boolean)).size;const counts={};data.forEach(x=>{const k=x.student_id||`${x.first_name}-${x.last_name}`;counts[k]=(counts[k]||0)+1});let legend=null,max=0;data.forEach(x=>{const k=x.student_id||`${x.first_name}-${x.last_name}`;if(counts[k]>max){max=counts[k];legend=x}});const recent=[...data].filter(x=>x.session_date).sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date)))[0];
  $('#hofSummary').innerHTML=[metricCard('🏆','Record attivi',data.length,'primati nella selezione','gold'),metricCard('⌁','Test rappresentati',tests,`${years||'—'} anni scolastici`,'blue'),metricCard('♛','Più presenze',legend?max:'—',legend?`${legend.first_name} ${legend.last_name}`:'Nessun record','violet'),metricCard('◷','Record più recente',recent?fmt(recent.session_date):'—',recent?recent.test_name:'Nessuna prestazione','good')].join('');
  $('#hofGrid').innerHTML=data.length?data.map((x,i)=>`<article class="hof-card ${counts[x.student_id||`${x.first_name}-${x.last_name}`]===max&&max>1?'hof-legend':''}"><div class="hof-top"><div class="medal">${i<3?'🏆':'✦'}</div><span class="hof-record-badge">RECORD ${x.sex==='F'?'F':'M'}</span></div><div class="hof-test">${esc(x.test_name)}</div><h4>${esc(x.first_name)} ${esc(x.last_name)}</h4><div class="hof-value">${fmtNum(x.result_value)} ${esc(x.unit)}</div><div class="hof-meta"><div>CLASSE<b>${esc(x.class_name||'—')}</b></div><div>ANNO<b>${esc(x.school_year_label||'—')}</b></div><div>DATA<b>${x.session_date?fmt(x.session_date):'—'}</b></div><div>PRESENZE HOF<b>${counts[x.student_id||`${x.first_name}-${x.last_name}`]||1}</b></div></div></article>`).join(''):emptyPremium('La Hall of Fame aspetta il primo record');
}
$('#hofTest').onchange=loadHof;$('#hofSex').onchange=loadHof;

function closureEmoji(reason='',type=''){
  const s=String(reason||'').toLowerCase();
  if(/natale/.test(s)) return '🎄';
  if(/pasqua/.test(s)) return '🐣';
  if(/carnevale/.test(s)) return '🎭';
  if(/ognissanti|tutti i santi/.test(s)) return '🕯️';
  if(/immacolata/.test(s)) return '🙏';
  if(/lavorator|1 maggio|primo maggio/.test(s)) return '🛠️';
  if(/liberazione|25 aprile/.test(s)) return '🇮🇹';
  if(/repubblica|2 giugno/.test(s)) return '🇮🇹';
  return '❌';
}
function fixedCalendarEmoji(iso){
  const md=String(iso||'').slice(5);
  return {
    '12-25':'🎅',
    '01-06':'🧙‍♀️',
    '01-01':'🎆',
    '11-01':'🕯️',
    '04-25':'🇮🇹',
    '06-02':'🇮🇹',
    '05-01':'🛠️',
    '12-08':'🙏'
  }[md]||'';
}
function classLabelForException(x){
  const c=st.classes.find(c=>String(c.id)===String(x.class_id));
  return c?.name||'Classe';
}


function schoolYearCalendarBounds(){
  const y=st.year;
  if(y?.start_date&&y?.end_date){
    const sy=Number(String(y.start_date).slice(0,4));
    const ey=Number(String(y.end_date).slice(0,4));
    return {
      min:new Date(sy,8,1),
      max:new Date(ey,5,1)
    };
  }
  const now=new Date(), startY=now.getMonth()>=8?now.getFullYear():now.getFullYear()-1;
  return {min:new Date(startY,8,1),max:new Date(startY+1,5,1)};
}
function clampCalendarMonth(d){
  const {min,max}=schoolYearCalendarBounds();
  const month=new Date(d.getFullYear(),d.getMonth(),1);
  if(month<min)return new Date(min);
  if(month>max)return new Date(max);
  return month;
}
function todayIsoLocal(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}


function renderAll(){
  renderDashboard();
  renderClasses();
  renderModules();
  renderSports();
  renderTests();
  renderSettings();
  st.month=clampCalendarMonth(st.month||new Date());
  renderCalendar();
}

function renderCalendar(){st.month=clampCalendarMonth(st.month||new Date());const todayIso=todayIsoLocal();let d=st.month,y=d.getFullYear(),m=d.getMonth();$('#monthTitle').textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(d);let first=new Date(y,m,1),start=new Date(y,m,1-((first.getDay()+6)%7)),html=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(x=>`<div class="cal-head">${x}</div>`).join('');for(let i=0;i<42;i++){let day=new Date(start);day.setDate(start.getDate()+i);let iso=localISODate(day),ev=st.lessons.filter(x=>x.lesson_date===iso).map(x=>`<div class="cal-event ${x.is_extra?'extra':''}" data-lesson="${x.id}">${x.start_time?`<span class="cal-time">${String(x.start_time).slice(0,5)}</span>`:''}${x.is_extra?'<span class="cal-extra-badge">EXTRA</span>':''}${esc(x.title)}</div>`).join(''),
dayExceptions=st.exceptions.filter(x=>iso>=x.exception_date&&iso<=(x.end_date||x.exception_date)),
schoolClosures=dayExceptions.filter(x=>x.scope==='school'&&x.exception_type!=='school_event'),
classTrips=dayExceptions.filter(x=>x.scope==='class'&&x.exception_type==='school_event'),
otherExceptions=dayExceptions.filter(x=>!(x.scope==='school'&&x.exception_type!=='school_event')&&!(x.scope==='class'&&x.exception_type==='school_event')),
isSchoolClosed=schoolClosures.length>0,
schoolEx=schoolClosures.map(x=>`<button type="button" class="cal-event exception school-closure-event cal-exception-btn" data-exception-id="${x.id}" data-exception-day="${iso}">${esc(x.reason||'Scuola chiusa')}</button>`).join(''),
tripEx=classTrips.map(x=>`<button type="button" class="cal-event class-trip-event cal-exception-btn" data-exception-id="${x.id}" data-exception-day="${iso}"><span class="trip-bus">🚌</span><span>${esc(classLabelForException(x))} · ${esc(x.reason||'Uscita / gita')}</span></button>`).join(''),
otherEx=otherExceptions.map(x=>`<button type="button" class="cal-event exception cal-exception-btn" data-exception-id="${x.id}" data-exception-day="${iso}">${esc(x.reason||x.exception_type)}</button>`).join(''),
closureDecor=isSchoolClosed?`<div class="school-closure-decor" aria-hidden="true">${closureEmoji(schoolClosures[0]?.reason,schoolClosures[0]?.exception_type)}</div>`:'',
fixedEmoji=fixedCalendarEmoji(iso),fixedDecor=fixedEmoji&&!isSchoolClosed?`<div class="fixed-holiday-emoji" aria-label="Ricorrenza">${fixedEmoji}</div>`:'',
ex=schoolEx+tripEx+otherEx;
html+=`<div class="cal-day ${day.getMonth()!==m?'off':''} ${isSchoolClosed?'school-closed-day':''} ${iso===todayIso?'today-day':''}"><div class="cal-num">${day.getDate()}</div>${ex}${ev}${closureDecor}${fixedDecor}</div>`}$('#calendarGrid').innerHTML=html;$$('#calendarGrid [data-lesson]').forEach(b=>b.onclick=()=>openLesson(b.dataset.lesson));$$('#calendarGrid [data-exception-id]').forEach(b=>b.onclick=()=>openCalendarException(b.dataset.exceptionId,b.dataset.exceptionDay))}
$('#prevMonth').onclick=()=>{const {min}=schoolYearCalendarBounds(),next=new Date(st.month.getFullYear(),st.month.getMonth()-1,1);if(next<min){toast('Il calendario scolastico parte da settembre');return}st.month=next;renderCalendar()};$('#nextMonth').onclick=()=>{const {max}=schoolYearCalendarBounds(),next=new Date(st.month.getFullYear(),st.month.getMonth()+1,1);if(next>max){toast('Il calendario scolastico termina a giugno');return}st.month=next;renderCalendar()};
function syncExceptionReasonUI(){
  const school=$('#exceptionScope').value==='school';
  const holiday=$('#exceptionType').value==='holiday';
  const usePreset=school&&holiday;
  $('#closurePresetWrap').classList.toggle('hidden',!usePreset);
  $('#exceptionReasonWrap').classList.toggle('hidden',usePreset&&$('#closurePreset').value!=='ALTRO');
  $('#exceptionReasonWrap').querySelector('span');
  if(!usePreset)$('#exceptionReasonWrap').classList.remove('hidden');
}
function openException(scope='school'){
  $('#exceptionScope').value=scope;
  $('#exceptionClassWrap').classList.toggle('hidden',scope==='school');
  if(scope==='school')$('#exceptionType').value='holiday';
  $('#closurePreset').value='VACANZE DI NATALE';
  $('#exceptionReason').value='';
  syncExceptionReasonUI();
  $('#exceptionModal').showModal()
}
$('#addException').onclick=()=>openException();
$('#schoolClosureBtn').onclick=()=>openException();
$('#exceptionScope').onchange=()=>{$('#exceptionClassWrap').classList.toggle('hidden',$('#exceptionScope').value==='school');syncExceptionReasonUI()};
$('#exceptionType').onchange=syncExceptionReasonUI;
$('#closurePreset').onchange=syncExceptionReasonUI;
let pendingCalendarException=null;
async function saveCalendarExceptionWithAction(action='none'){
  const p=pendingCalendarException;if(!p)return;
  const submit=$('#exceptionForm button[type="submit"]');
  try{
    if(submit)submit.disabled=true;
    const{error}=await db.rpc('pe_create_calendar_exception_with_action',{p_school_year_id:st.year.id,p_class_id:p.school?null:p.classId,p_exception_date:p.start,p_end_date:p.end,p_scope:p.school?'school':'class',p_exception_type:p.type,p_reason:p.reason||null,p_action:action});
    if(error)throw error;
    $('#exceptionConflictModal')?.close();$('#exceptionModal').close();pendingCalendarException=null;
    toast(action==='shift'?'Chiusura salvata · lezioni slittate':action==='cancel'?'Chiusura salvata · lezioni cancellate':'Chiusura salvata');
    await loadCore();renderCalendar();renderModules();
  }catch(err){toast(err.message||'Errore calendario')}finally{if(submit)submit.disabled=false}
}
function renderExceptionConflictModal(lessons){
  const byClass=new Map();lessons.forEach(l=>{const name=st.classes.find(c=>c.id===l.class_id)?.name||'Classe';if(!byClass.has(name))byClass.set(name,[]);byClass.get(name).push(l)});
  $('#exceptionConflictBody').innerHTML=`<div class="conflict-summary"><span class="conflict-icon">⚠️</span><div><h4>${lessons.length} ${lessons.length===1?'lezione programmata':'lezioni programmate'} nel periodo scelto</h4><p>La nuova chiusura coincide con lezioni già presenti. Scegli cosa deve fare AttivaMente.</p></div></div><div class="conflict-lessons">${[...byClass.entries()].map(([name,arr])=>`<div class="conflict-class"><b>${esc(name)}</b>${arr.map(l=>`<small>${fmt(l.lesson_date)} · ${esc(l.title)}</small>`).join('')}</div>`).join('')}</div>`;
  $('#exceptionShiftBtn').onclick=()=>saveCalendarExceptionWithAction('shift');$('#exceptionCancelLessonsBtn').onclick=()=>saveCalendarExceptionWithAction('cancel');$('#exceptionConflictModal').showModal()
}
$('#exceptionForm').onsubmit=async e=>{
  e.preventDefault();if(!requireSchoolYear('Crea prima l’anno scolastico per inserire chiusure e gite.'))return;
  const school=$('#exceptionScope').value==='school',classId=$('#exceptionClass').value,start=$('#exceptionStart').value,end=$('#exceptionEnd').value||start,type=$('#exceptionType').value;
  const reason=(school&&type==='holiday'&&$('#closurePreset').value!=='ALTRO'?$('#closurePreset').value:$('#exceptionReason').value.trim())||null;
  if(!start||!end){toast('Inserisci data iniziale e finale');return}
  pendingCalendarException={school,classId,start,end,type,reason};
  let q=db.from('pe_lessons').select('id,class_id,lesson_date,title,module_id,sequence_no,start_time').eq('status','planned').gte('lesson_date',start).lte('lesson_date',end);if(!school)q=q.eq('class_id',classId);
  const{data:conflicts,error}=await q.order('lesson_date');if(error){toast(error.message);return}
  if((conflicts||[]).length){renderExceptionConflictModal(conflicts);return}
  await saveCalendarExceptionWithAction('none');
};

let lessonBuildTarget=null,extraSelectedActivity=null,extraManualItems=[],manualLessonItems=[];
function builderTotal(items){return items.reduce((s,x)=>s+(Number(x.duration)||0),0)}
function renderBuilder(items,containerId,balanceId,totalMinutes){const c=$(containerId),bal=$(balanceId);if(!c||!bal)return;c.innerHTML=items.length?items.map((x,i)=>`<div class="builder-item"><div class="builder-order">${i+1}</div><div><strong>${esc(x.title)}</strong><small>${esc(x.sourceLabel||'Attività manuale')}</small></div><input type="number" min="1" max="240" value="${Number(x.duration)||15}" data-build-duration="${i}"><button type="button" class="builder-remove" data-build-remove="${i}">×</button></div>`).join(''):'<div class="builder-empty">Nessuna attività inserita.</div>';const used=builderTotal(items),rem=totalMinutes-used;bal.textContent=totalMinutes>0?`${used} min utilizzati · ${rem>=0?rem+' min rimanenti':Math.abs(rem)+' min oltre la durata'}`:`Imposta l’orario per calcolare la durata.`;bal.classList.toggle('over',rem<0);c.querySelectorAll('[data-build-duration]').forEach(inp=>inp.oninput=()=>{items[+inp.dataset.buildDuration].duration=Math.max(1,+inp.value||1);renderBuilder(items,containerId,balanceId,totalMinutes)});c.querySelectorAll('[data-build-remove]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.buildRemove,1);renderBuilder(items,containerId,balanceId,totalMinutes)})}
function extraDuration(){return minutesBetween($('#extraStart').value,$('#extraEnd').value)}
function manualDuration(){return minutesBetween($('#manualStart').value,$('#manualEnd').value)}
function refreshExtraPanels(){const mode=document.querySelector('input[name="extraMode"]:checked')?.value||'single';$('#extraSinglePanel').classList.toggle('hidden',mode!=='single');$('#extraAutoPanel').classList.toggle('hidden',mode!=='auto');$('#extraManualPanel').classList.toggle('hidden',mode!=='manual');renderBuilder(extraManualItems,'#extraManualBuilder','#extraManualBalance',extraDuration())}
function openArchivePicker(target){lessonBuildTarget=target;$('#archivePickerTitle').textContent='Scegli la disciplina';$('#archivePickerBody').innerHTML=`<div class="archive-picker-sports">${st.sports.map(s=>`<button type="button" class="archive-picker-sport" data-archive-sport="${s.id}"><span>${iconMap[s.slug]||'🏅'}</span><b>${esc(s.name)}</b><small>${st.sportCounts[s.id]||0} attività verificate</small></button>`).join('')}<button type="button" class="archive-picker-sport" data-archive-primary="1"><span>🎒</span><b>Giochi scuola primaria</b><small>Libro + giochi creati da te</small></button></div>`;$$('[data-archive-sport]').forEach(b=>b.onclick=()=>showArchiveSport(b.dataset.archiveSport));$('[data-archive-primary]').onclick=showArchivePrimary;if(!$('#archivePickerModal').open)$('#archivePickerModal').showModal()}
async function showArchiveSport(sportId){const sp=st.sports.find(x=>x.id===sportId);$('#archivePickerTitle').textContent=sp?.name||'Attività';$('#archivePickerBody').innerHTML='<p class="muted">Caricamento…</p>';const{data,error}=await db.from('pe_exercises').select('id,name,student_explanation,difficulty,duration_min,duration_max,field_dimensions,sport_id').eq('sport_id',sportId).eq('active',true).eq('audit_status','VERIFIED').order('name').limit(500);if(error)return toast(error.message);$('#archivePickerBody').innerHTML=`<button type="button" class="btn secondary archive-back" id="archiveBack">← Discipline</button><div class="archive-picker-exercises">${(data||[]).map(e=>`<article class="archive-pick-card"><h4>${esc(e.name)}</h4><p>${esc(e.student_explanation||'')}</p><div class="category-pills"><span class="chip">Liv. ${e.difficulty||'—'}</span><span class="chip">${e.duration_min||'—'}–${e.duration_max||'—'}'</span></div><button type="button" class="btn primary small-btn" data-pick-archive-ex="${e.id}">Aggiungi</button></article>`).join('')}</div>`;$('#archiveBack').onclick=()=>openArchivePicker(lessonBuildTarget);$$('[data-pick-archive-ex]').forEach(b=>b.onclick=()=>pickArchiveExercise((data||[]).find(x=>x.id===b.dataset.pickArchiveEx),sp))}
async function showArchivePrimary(){await loadPrimaryGames();$('#archivePickerTitle').textContent='Giochi scuola primaria';$('#archivePickerBody').innerHTML=`<button type="button" class="btn secondary archive-back" id="archiveBack">← Discipline</button><div class="archive-picker-exercises">${st.primaryGames.map(g=>`<article class="archive-pick-card"><h4>${esc(g.title)}</h4><p>${esc(g.description||'')}</p><div class="category-pills"><span class="chip">Liv. ${g.difficulty||'—'}</span></div><button type="button" class="btn primary small-btn" data-pick-primary="${esc(g.id)}">Aggiungi</button></article>`).join('')}</div>`;$('#archiveBack').onclick=()=>openArchivePicker(lessonBuildTarget);$$('[data-pick-primary]').forEach(b=>b.onclick=()=>pickPrimaryActivity(primaryById(b.dataset.pickPrimary)))}
function defaultActivityDuration(e,total=60){const a=Number(e?.duration_min)||10,b=Number(e?.duration_max)||a;return Math.max(5,Math.min(total,Math.round((a+b)/2)))}
function pushBuildItem(item){if(lessonBuildTarget==='extra-single'){extraSelectedActivity=item;$('#extraSelectedSummary').innerHTML=`<strong>${esc(item.title)}</strong><small>${esc(item.sourceLabel)}</small>`}else if(lessonBuildTarget==='manual'){manualLessonItems.push(item);renderBuilder(manualLessonItems,'#manualLessonBuilder','#manualLessonBalance',manualDuration())}else if(lessonBuildTarget==='extra-manual'){extraManualItems.push(item);renderBuilder(extraManualItems,'#extraManualBuilder','#extraManualBalance',extraDuration())}$('#archivePickerModal').close()}
function pickArchiveExercise(e,sp){if(!e)return;pushBuildItem({kind:'exercise',exercise_id:e.id,title:e.name,description:e.student_explanation||'',duration:defaultActivityDuration(e,lessonBuildTarget==='manual'?manualDuration():extraDuration()),sourceLabel:sp?.name||'Archivio sport'})}
function pickPrimaryActivity(g){if(!g)return;const marker=g.is_custom?`PRIMARY_GAME:CUSTOM:${g.id}`:`PRIMARY_GAME:BOOK:${g.source_page}`;pushBuildItem({kind:'primary',primary_game_ref:marker,title:g.title,description:g.description||'',field:g.material_spaces||'',duration:15,sourceLabel:'Giochi scuola primaria'})}
function openCustomActivity(target){lessonBuildTarget=target;$('#customActivityForm').reset();$('#customActivityDuration').value=15;$('#customActivityModal').showModal()}
$('#customActivityForm').onsubmit=e=>{e.preventDefault();const item={kind:'custom',title:$('#customActivityTitle').value.trim(),description:$('#customActivityDescription').value.trim(),duration:+$('#customActivityDuration').value||15,sourceLabel:'Scritta da te'};if(!item.title||!item.description)return;pushBuildItem(item);$('#customActivityModal').close()};
async function insertLessonItems(lessonId,items,totalMinutes){let used=0;const payload=items.map((x,i)=>{used+=Number(x.duration)||0;return{owner_id:st.user.id,lesson_id:lessonId,exercise_id:x.kind==='exercise'?x.exercise_id:null,phase:i===0?'activation':(i===items.length-1&&items.length>1?'final':'main'),order_no:i+1,duration_min:Number(x.duration)||10,custom_title:x.kind==='exercise'?null:x.title,custom_explanation:x.kind==='exercise'?null:x.description,custom_field_dimensions:x.kind==='primary'?(x.field||null):null,primary_game_ref:x.kind==='primary'?x.primary_game_ref:null,selection_reason:x.kind==='exercise'?'Selezionata manualmente dall’archivio verificato.':x.kind==='primary'?'Selezionata dai Giochi scuola primaria.':'Attività inserita manualmente dal docente.'}});if(used<totalMinutes)payload.push({owner_id:st.user.id,lesson_id:lessonId,exercise_id:null,phase:'closing',order_no:payload.length+1,duration_min:totalMinutes-used,custom_title:'Tempo flessibile / chiusura',custom_explanation:'Spazio lasciato al docente per transizioni, recupero materiale, feedback o prolungamento delle attività.',selection_reason:'Completamento automatico della durata totale.'});const{error}=await db.from('pe_lesson_exercises').insert(payload);if(error)throw error}
async function generateSingleAutomaticLesson(lessonId,classId,sportId,totalMinutes){
  const [{data:cl,error:ce},{data:lv,error:le},{data:ex,error:ee}]=await Promise.all([
    db.from('pe_classes').select('general_level,student_count').eq('id',classId).single(),
    db.from('pe_class_sport_levels').select('level').eq('class_id',classId).eq('sport_id',sportId).maybeSingle(),
    db.from('pe_exercises').select('id,name,difficulty,duration_min,duration_max,category_id,fun_score,decision_making,idle_time,max_players,pe_categories(name)').eq('sport_id',sportId).eq('active',true).eq('audit_status','VERIFIED').limit(500)
  ]);
  if(ce||le||ee)throw(ce||le||ee);
  const level=Math.max(1,Math.min(5,Number(lv?.level||cl?.general_level||2))),all=ex||[];
  const mainCount=totalMinutes<=60?2:totalMinutes<=90?3:4,needed=mainCount+2;
  const byCat=new Map();all.filter(x=>x.category_id).forEach(x=>{if(!byCat.has(x.category_id))byCat.set(x.category_id,[]);byCat.get(x.category_id).push(x)});
  const gap=arr=>arr.reduce((s,x)=>s+Math.abs((x.difficulty||3)-level),0)/arr.length;
  const focus=[...byCat.entries()].filter(([,arr])=>arr.length>=needed).sort((a,b)=>gap(a[1])-gap(b[1])||b[1].length-a[1].length)[0];
  if(!focus)throw new Error('Archivio insufficiente: non trovo abbastanza attività coerenti dello stesso tema per costruire l’intera lezione.');
  const focusName=focus[1][0]?.pe_categories?.name||'Focus tecnico',pool=[...focus[1]],chosen=[];
  const take=score=>{const avail=pool.filter(x=>!chosen.some(c=>c.id===x.id)).sort((a,b)=>score(a)-score(b));const x=avail[0];if(x)chosen.push(x);return x};
  const activation=take(x=>Math.abs((x.difficulty||3)-Math.max(1,level-1))*10-(x.fun_score||3)+(x.idle_time||3));
  const mains=[];for(let i=0;i<mainCount;i++){const target=Math.max(1,Math.min(5,level+(i>=Math.ceil(mainCount/2)?0:-1)));mains.push(take(x=>Math.abs((x.difficulty||3)-target)*10-(i>=Math.ceil(mainCount/2)?(x.decision_making||3):0)))}
  const final=take(x=>Math.abs((x.difficulty||3)-Math.min(5,level+1))*8-(x.decision_making||3)*1.5-(x.fun_score||3));
  if(!activation||mains.some(x=>!x)||!final)throw new Error(`Attività coerenti insufficienti per il focus “${focusName}”.`);
  const actMin=Math.min(15,Math.max(8,Math.round(totalMinutes*.13))),closeMin=Math.min(8,Math.max(5,Math.round(totalMinutes*.05))),finalMin=Math.min(30,Math.max(15,Math.round(totalMinutes*.27))),mainTotal=totalMinutes-actMin-closeMin-finalMin,each=Math.floor(mainTotal/mainCount),rows=[];
  rows.push({e:activation,phase:'activation',dur:actMin,reason:`Attivazione propedeutica al focus “${focusName}”.`});
  mains.forEach((x,i)=>rows.push({e:x,phase:'main',dur:i===mainCount-1?mainTotal-each*(mainCount-1):each,reason:`Parte centrale sullo stesso focus “${focusName}”, con difficoltà progressiva.`}));
  rows.push({e:final,phase:'final',dur:finalMin,reason:`Applicazione finale coerente con il focus “${focusName}”.`});
  const payload=rows.map((r,i)=>({owner_id:st.user.id,lesson_id:lessonId,exercise_id:r.e.id,phase:r.phase,order_no:i+1,duration_min:r.dur,selection_reason:r.reason}));
  payload.push({owner_id:st.user.id,lesson_id:lessonId,exercise_id:null,phase:'closing',order_no:payload.length+1,duration_min:closeMin,custom_title:'Chiusura e feedback',custom_explanation:`Recupero materiale e feedback sul focus: ${focusName}.`,selection_reason:'Chiusura flessibile della lezione.'});
  const{error}=await db.from('pe_lesson_exercises').insert(payload);if(error)throw error;
  await db.from('pe_lessons').update({learning_goal:`${focusName}: progressione coerente dal semplice al complesso.`,teacher_notes:`Lezione extra automatica con focus unico: ${focusName}.`}).eq('id',lessonId);
}
$('#addExtraLesson').onclick=()=>{if(!requireSchoolYear('Crea prima l’anno scolastico per inserire una lezione extra.'))return;extraSelectedActivity=null;extraManualItems=[];$('#extraLessonForm').reset();$('#extraDate').value=localISODate(new Date());$('#extraSelectedSummary').textContent='Nessuna attività scelta.';$('#extraLessonMsg').textContent='';document.querySelector('input[name="extraMode"][value="single"]').checked=true;refreshExtraPanels();$('#extraLessonModal').showModal()};
$$('input[name="extraMode"]').forEach(r=>r.onchange=refreshExtraPanels);['#extraStart','#extraEnd'].forEach(id=>$(id).addEventListener('change',refreshExtraPanels));$('#extraPickArchive').onclick=()=>openArchivePicker('extra-single');$('#extraAddManualActivity').onclick=()=>openCustomActivity('extra-manual');
const addManualLessonBtn=$('#addManualLesson');if(addManualLessonBtn)addManualLessonBtn.onclick=()=>{if(!requireSchoolYear('Crea prima l’anno scolastico.'))return;manualLessonItems=[];$('#manualLessonForm').reset();$('#manualDate').value=localISODate(new Date());$('#manualLessonMsg').textContent='';renderBuilder(manualLessonItems,'#manualLessonBuilder','#manualLessonBalance',0);$('#manualLessonModal').showModal()};['#manualStart','#manualEnd'].forEach(id=>$(id).addEventListener('change',()=>renderBuilder(manualLessonItems,'#manualLessonBuilder','#manualLessonBalance',manualDuration())));$('#manualPickArchive').onclick=()=>openArchivePicker('manual');$('#manualAddCustom').onclick=()=>openCustomActivity('manual');
$('#extraLessonForm').onsubmit=async e=>{e.preventDefault();const msg=$('#extraLessonMsg'),cid=$('#extraClass').value,date=$('#extraDate').value,start=$('#extraStart').value,end=$('#extraEnd').value,mode=document.querySelector('input[name="extraMode"]:checked')?.value||'single',mins=minutesBetween(start,end);if(!cid||!date||mins<=0){msg.textContent='Completa classe, data e un orario valido.';return}if(mode==='single'&&!extraSelectedActivity){msg.textContent='Scegli un’attività dall’archivio.';return}if(mode==='auto'&&!$('#extraAutoSport').value){msg.textContent='Scegli lo sport.';return}if(mode==='manual'&&!extraManualItems.length){msg.textContent='Inserisci almeno un’attività manuale.';return}if(mode==='manual'&&builderTotal(extraManualItems)>mins){msg.textContent='La somma delle attività supera la durata della lezione.';return}const cl=st.classes.find(x=>x.id===cid),title=$('#extraTitle').value.trim()||`Lezione extra · ${cl?.name||'Classe'}`;msg.textContent='Creo la lezione…';const sportId=mode==='auto'?$('#extraAutoSport').value:(mode==='single'&&extraSelectedActivity?.kind==='exercise'?(await db.from('pe_exercises').select('sport_id').eq('id',extraSelectedActivity.exercise_id).single()).data?.sport_id:null);const{data:lesson,error}=await db.from('pe_lessons').insert({owner_id:st.user.id,module_id:null,class_id:cid,sport_id:sportId||null,lesson_date:date,sequence_no:1,title,duration_min:mins,generation_mode:'manual',status:'planned',teacher_notes:$('#extraNotes').value.trim()||null,start_time:start,end_time:end,is_extra:true,learning_goal:mode==='auto'?'Lezione extra generata automaticamente dall’archivio verificato.':'Lezione extra costruita dal docente.'}).select().single();if(error){msg.textContent='Errore: '+error.message;return}try{if(mode==='auto')await generateSingleAutomaticLesson(lesson.id,cid,$('#extraAutoSport').value,mins);else if(mode==='single'){const x={...extraSelectedActivity,duration:mins};await insertLessonItems(lesson.id,[x],mins)}else await insertLessonItems(lesson.id,extraManualItems,mins)}catch(err){await db.from('pe_lessons').delete().eq('id',lesson.id);msg.textContent='Errore: '+err.message;return}$('#extraLessonModal').close();toast('Lezione extra inserita');await loadCore();renderCalendar()};
$('#manualLessonForm').onsubmit=async e=>{e.preventDefault();const msg=$('#manualLessonMsg'),cid=$('#manualClass').value,date=$('#manualDate').value,start=$('#manualStart').value,end=$('#manualEnd').value,mins=minutesBetween(start,end);if(!cid||!date||mins<=0){msg.textContent='Completa classe, data e un orario valido.';return}if(!manualLessonItems.length){msg.textContent='Inserisci almeno un’attività.';return}if(builderTotal(manualLessonItems)>mins){msg.textContent='La somma delle attività supera la durata della lezione.';return}const cl=st.classes.find(x=>x.id===cid),title=$('#manualTitle').value.trim()||`Lezione manuale · ${cl?.name||'Classe'}`;msg.textContent='Salvataggio…';const{data:lesson,error}=await db.from('pe_lessons').insert({owner_id:st.user.id,module_id:null,class_id:cid,sport_id:null,lesson_date:date,sequence_no:1,title,duration_min:mins,generation_mode:'manual',status:'planned',teacher_notes:$('#manualNotes').value.trim()||null,start_time:start,end_time:end,is_extra:false,learning_goal:'Lezione costruita manualmente dal docente.'}).select().single();if(error){msg.textContent='Errore: '+error.message;return}try{await insertLessonItems(lesson.id,manualLessonItems,mins)}catch(err){await db.from('pe_lessons').delete().eq('id',lesson.id);msg.textContent='Errore: '+err.message;return}$('#manualLessonModal').close();toast('Lezione manuale inserita');await loadCore();renderCalendar()};


function openCalendarException(id,day){
  const closure=st.exceptions.find(x=>String(x.id)===String(id));
  if(!closure||!day)return;
  const kind={
    holiday:'Vacanza / chiusura',
    school_event:'Gita / uscita',
    no_lesson:'Lezione annullata',
    other:'Altro'
  }[closure.exception_type]||closure.exception_type||'Chiusura';
  const className=closure.scope==='class'
    ? (st.classes.find(c=>String(c.id)===String(closure.class_id))?.name||'Classe')
    : '';
  const icon=closure.exception_type==='school_event'?'🚌':closureEmoji(closure.reason,closure.exception_type);
  $('#exceptionDetailTitle').textContent=closure.reason||kind;
  $('#exceptionDetailBody').innerHTML=`<div class="exception-detail-card"><div class="exception-detail-icon">${icon}</div><div><span class="kicker">${closure.scope==='school'?'TUTTA LA SCUOLA':esc(className)}</span><h4>${esc(closure.reason||kind)}</h4><p><strong>${fmt(day)}</strong></p>${closure.scope==='class'?`<p>🚌 ${esc(className)}</p>`:''}<small>${closure.scope==='school'?'Chiusura generale della scuola':'Eccezione riferita alla classe selezionata'}</small></div></div>`;
  const del=$('#deleteExceptionDayBtn');
  del.textContent=closure.scope==='school'?'Elimina questa giornata':'Elimina questa gita / eccezione';
  del.onclick=async()=>{del.disabled=true;await deleteSingleClosureDay(id,day);del.disabled=false;$('#exceptionDetailModal').close()};
  $('#exceptionDetailModal').showModal();
}

async function deleteSingleClosureDay(id,day){
  try{
    const {error}=await db.rpc('pe_remove_calendar_exception_day',{
      p_exception_id:id,
      p_day:day
    });
    if(error)throw error;
    toast(`Chiusura rimossa solo per ${fmt(day)}`);
    await loadCore();
    renderCalendar();
    renderModules();
    renderSettings();
  }catch(err){
    toast(err.message||'Errore durante eliminazione della giornata');
  }
}

async function deleteSchoolClosure(id){
  const closure=st.exceptions.find(x=>String(x.id)===String(id));
  if(!closure)return;
  const label=closure.reason||'Chiusura';
  const range=`${fmt(closure.exception_date)}${closure.end_date&&closure.end_date!==closure.exception_date?' → '+fmt(closure.end_date):''}`;
  const ok=await appConfirm({
    icon:'🚪',
    kicker:'ELIMINA CHIUSURA',
    title:label,
    message:range,
    details:'Verrà eliminato l’intero blocco di chiusura. Le lezioni già slittate resteranno nelle date attuali.',
    confirmText:'Elimina chiusura'
  });
  if(!ok)return;
  try{
    const {error}=await db.from('pe_calendar_exceptions').delete().eq('id',id).eq('owner_id',st.user.id);
    if(error)throw error;
    toast('Chiusura eliminata · data nuovamente disponibile');
    await loadCore();
    renderCalendar();
    renderModules();
    renderSettings();
  }catch(err){
    toast(err.message||'Errore durante eliminazione chiusura');
  }
}

function renderSettings(){
  $('#closureList').innerHTML=st.exceptions.filter(x=>x.scope==='school').map(x=>listItem(
    x.reason||'Chiusura',
    `${fmt(x.exception_date)}${x.end_date!==x.exception_date?' → '+fmt(x.end_date):''}`,
    `<div class="closure-actions"><span class="chip">${x.exception_type}</span><button class="btn danger small closure-delete-btn" type="button" data-delete-closure="${x.id}">Elimina</button></div>`
  )).join('')||listItem('Nessuna chiusura','Inserisci ponti e vacanze');
  document.querySelectorAll('[data-delete-closure]').forEach(btn=>{
    btn.onclick=()=>deleteSchoolClosure(btn.dataset.deleteClosure);
  });
  $('#activeYearStatus').innerHTML=st.year?`<span class="chip good">Attivo</span><strong>${esc(st.year.label)}</strong><small>${fmt(st.year.start_date)} → ${fmt(st.year.end_date)}</small>`:`<span class="chip warn">Da configurare</span><strong>Nessun anno scolastico attivo</strong><small>Crealo prima di classi, calendario e test.</small>`;
  $('#migrateYearBtn').textContent=st.year?'Crea nuovo anno scolastico':'Crea il primo anno scolastico';
  const yl=$('#schoolYearList');
  if(yl){
    yl.innerHTML=(st.schoolYears||[]).map(y=>`<div class="list-item school-year-row"><div><strong>${esc(y.label)}</strong><small>${fmt(y.start_date)} → ${fmt(y.end_date)} ${y.is_active?'· ATTIVO':''}</small></div><button type="button" class="btn danger small-btn" data-delete-year="${y.id}">Elimina</button></div>`).join('')||listItem('Nessun anno scolastico','Crea il primo anno per iniziare');
    $$('[data-delete-year]').forEach(b=>b.onclick=()=>deleteSchoolYear(b.dataset.deleteYear));
  }
  const build=$('#buildVersion');if(build)build.textContent='Versione 5.9';
}
async function deleteSchoolYear(id){
  const y=(st.schoolYears||[]).find(x=>x.id===id);if(!y)return;
  const classes=st.classes.filter(c=>c.school_year_id===id).length;
  if(!(await appConfirm({
    icon:'⚠️',
    kicker:'ELIMINAZIONE DEFINITIVA',
    title:`Eliminare l’anno ${y.label}?`,
    message:`Verranno eliminati i dati collegati a questo anno scolastico${classes?` (${classes} ${classes===1?'classe':'classi'})`:''}.`,
    details:'Classi dell’anno, calendario, sessioni test e relativo storico verranno rimossi. Gli altri anni, gli sport e l’archivio esercizi non saranno toccati. Questa operazione non può essere annullata.',
    confirmText:'Elimina definitivamente'
  })))return;
  try{
    toast('Elimino l’anno scolastico…');
    const{data,error}=await db.rpc('pe_delete_school_year',{p_school_year_id:id});if(error)throw error;
    await loadCore();st.month=clampCalendarMonth(new Date());renderAll();toast(`Anno ${y.label} eliminato`);
  }catch(err){console.error(err);toast(err.message||'Impossibile eliminare l’anno scolastico')}
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
    $('#migrateModal').close();await loadCore();st.month=clampCalendarMonth(new Date());renderAll();
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
  const primaryGameCount=$('#primaryGameCount');
if(primaryGameCount) primaryGameCount.textContent=all.length;
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
const newPrimaryGameBtn=$('#newPrimaryGameBtn');
if(newPrimaryGameBtn){
  newPrimaryGameBtn.classList.toggle('hidden',!isOwner());
  if(isOwner()) newPrimaryGameBtn.onclick=()=>openPrimaryGameForm();
}
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
  if(!(await appConfirm({
    icon:'🎲',
    kicker:'ELIMINA GIOCO',
    title:`Eliminare “${g.title}”?`,
    message:'Il gioco creato da te verrà rimosso dall’archivio.',
    details:'Questa operazione non può essere annullata.',
    confirmText:'Elimina gioco'
  })))return;
  try{if(g.image_kind==='storage'&&g.image_path)await db.storage.from(PRIMARY_BUCKET).remove([g.image_path]);const{error}=await db.from('pe_primary_games').delete().eq('id',g.id);if(error)throw error;$('#primaryGameModal').close();toast('Gioco eliminato');await loadPrimaryCustom();st.primaryGames=[...st.primaryCustom,...st.primaryDefaults];renderPrimaryGames()}catch(err){toast('Impossibile eliminare il gioco');console.error(err)}
}

function setSyncState(kind='ok',label='Sincronizzato'){const el=$('#syncStatus');if(!el)return;el.classList.toggle('syncing',kind==='syncing');el.classList.toggle('error',kind==='error');const t=el.querySelector('span');if(t)t.textContent=label}
let syncPromise=null,lastSyncAt=0;
async function syncFromCloud({quiet=false}={}){

  if(!st.user) return;

  // Se un Sync è già in corso, tutti gli altri
  // utilizzano la stessa sincronizzazione.
  if(syncPromise){
    return syncPromise;
  }

  syncPromise=(async()=>{

    if(!quiet){
      setSyncState('syncing','Sincronizzo…');
    }

    try{

      await loadCore();

      // I giochi primaria vengono caricati solo quando serve.
// Non devono rallentare la sincronizzazione generale.
if($('#view-primarygames')?.classList.contains('active')){
  loadPrimaryGames().catch(err=>{
    console.warn('Aggiornamento giochi primaria non riuscito',err);
  });
}

      renderSports();
      renderCalendar();

      lastSyncAt=Date.now();

      setSyncState('ok','Sincronizzato');

    }catch(err){

      console.error(err);
      setSyncState('error','Sync non riuscita');

    }finally{

      syncPromise=null;

    }

  })();

  return syncPromise;
}
$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  const msg=$('#loginMsg');
  msg.textContent='Accesso sicuro…';

  const email=$('#email').value.trim();
  const password=$('#password').value;
 

  const {data,error}=await db.auth.signInWithPassword({email,password});
  

  if(error){
    msg.textContent='Email o password non corrette.';
    return;
  }

  msg.textContent='Sincronizzazione dati…';

if(data?.user){
  await enter(data.user);
}

  msg.textContent='';
};
$('#logoutBtn').onclick=()=>db.auth.signOut();
async function enter(user){
  st.user=user;

  const ownerNavBtn=document.getElementById('ownerNavBtn');
  if(ownerNavBtn){
    ownerNavBtn.classList.toggle('hidden',!isOwner());
  }

  const newPrimaryGameBtn=document.getElementById('newPrimaryGameBtn');
  if(newPrimaryGameBtn){
    newPrimaryGameBtn.classList.toggle('hidden',!isOwner());
    newPrimaryGameBtn.onclick=isOwner()
      ? ()=>openPrimaryGameForm()
      : null;
  }

  $('#userMail').textContent=user.email||'';
  $('#authView').classList.add('hidden');
  $('#appView').classList.remove('hidden');

  await syncFromCloud();
}
async function restoreSessionAtStartup(){

  const {
    data:{session},
    error
  }=await db.auth.getSession();

  if(error || !session) return;

  // Una PWA su iPhone può riaprire una sessione salvata
  // con access token scaduto o non ancora ripristinato.
  // Prima di interrogare il database forziamo il rinnovo.
  const {
    data:refreshed,
    error:refreshError
  }=await db.auth.refreshSession();

  if(refreshError || !refreshed?.session){
    console.warn('Sessione scaduta: nuovo accesso necessario',refreshError);
    await db.auth.signOut();
    return;
  }

  await enter(refreshed.session.user);
}

await restoreSessionAtStartup();
db.auth.onAuthStateChange((event,session)=>{
  if(!session){
    st.user=null;
    $('#appView').classList.add('hidden');
    $('#authView').classList.remove('hidden');
    return;
  }

  // LOGIN viene già gestito direttamente da signInWithPassword().
  // Qui entriamo automaticamente solo quando serve davvero:
  // riapertura app, refresh pagina o ripristino sessione.
  if(!st.user && event!=='SIGNED_IN'){
    setTimeout(()=>enter(session.user),0);
  }
});
addEventListener('online',()=>syncFromCloud());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastSyncAt>5000)syncFromCloud({quiet:true})});
if('serviceWorker'in navigator)addEventListener('load',async()=>{try{const r=await navigator.serviceWorker.register('./service-worker.js?v=5.9',{updateViaCache:'none'});await r.update();}catch(e){console.warn('SW update',e)}});
