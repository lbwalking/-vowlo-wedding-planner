/* Supabase transport + account-scoped offline outbox. No service/admin keys. */
window.VowloCloud = (() => {
  const cfg=window.VOWLO_CONFIG||{}, model=window.VowloModel;
  let client=null, user=null, box=null, busy=false, ready=false, epoch=0, serial=0, conflict=null, message='', recovery=false;
  let localError='';
  const localKey='vowloV4.local';
  const accountKey=id=>'vowloV4.account.'+id;
  function read(key) {const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}
  function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
  function loadLocal(){try {return model.normalize(read(localKey)||read('vowloData')||model.empty());}catch(e){localError='Stored data could not be read. The original has been preserved. Export the original before making changes.';return model.empty();}}
  function notify(){window.updateCloudStatus?.();}
  function changed(){window.render?.();}
  function status(){return {enabled:!!client,user,ready,busy,message:localError||message,conflict:!!conflict,dirty:!!box?.dirty,recovery,localError};}
  function save(payload){
    const clean=model.normalize(payload);
    if(localError) throw Error(localError);
    if(user){
      if(!ready) throw Error('Wait for your account to load.');
      const next={...box,payload:clean,dirty:true};
      write(accountKey(user.id),next);box=next;serial++;message='Saved on this device · waiting to sync';
      notify();void sync();
    } else {write(localKey,clean);message='Saved on this device';notify();}
  }
  function editable(){return !localError && (!user||ready);}
  async function attach(session,event){
    if(event==='PASSWORD_RECOVERY') {recovery=true;window.page='account';}
    const next=session?.user||null;
    if(next?.id===user?.id){if(!next)message='Device-only mode';if(recovery) window.go?.('account');return;}
    epoch++;serial++;conflict=null;busy=false;ready=false;user=next;box=null;
    if(!user){message='Device-only mode';window.setPlannerData?.(loadLocal());changed();return;}
    message='Loading your private planner…';
    try {
      const saved=read(accountKey(user.id));
      if(saved){box={...saved,payload:model.normalize(saved.payload)};ready=true;}
      else box={payload:model.empty(),revision:0,dirty:false};
      window.setPlannerData?.(box.payload);changed();
      await sync();
    }catch(e){message='Could not open this account on this device. '+e.message;notify();}
    if(recovery) window.go?.('account');
  }
  async function fetchRow(uid){
    const {data,error}=await client.from('weddings').select('user_id,payload,revision,updated_at').eq('user_id',uid).maybeSingle();
    if(error) throw error;
    return data;
  }
  async function sync(){
    if(!client||!user||busy||conflict)return;
    if(!navigator.onLine){message=box?.dirty?'Offline · changes saved on this device':'Offline · showing this device’s saved copy';notify();return;}
    const token=epoch, uid=user.id, startSerial=serial;
    busy=true;notify();
    try {
      const {data:verified,error:authError}=await client.auth.getUser();
      if(authError||verified.user?.id!==uid) throw Error('Sign in again to sync. Your pending changes remain on this device.');
      if(token!==epoch)return;
      if(box.dirty){
        const sent=JSON.parse(JSON.stringify(box));
        const {data:rows,error}=await client.rpc('save_wedding',{p_payload:sent.payload,p_expected_revision:sent.revision});
        if(error)throw error;
        if(token!==epoch)return;
        if(!rows?.length){const remote=await fetchRow(uid);if(token!==epoch)return;conflict={remote};message='Another device changed this planner. Review both copies before continuing.';}
        else {
          if(rows[0].user_id!==uid)throw Error('Unexpected account response.');
          box={...box,revision:rows[0].revision,dirty:serial!==startSerial};
          write(accountKey(uid),box);message=box.dirty?'New changes waiting to sync':'Saved to cloud';
        }
      }else{
        const row=await fetchRow(uid);
        if(token!==epoch || serial!==startSerial)return;
        if(!window.vowloDraft || !ready){
          const nextBox={payload:row?model.normalize(row.payload):model.empty(),revision:row?.revision||0,dirty:false};
          const shouldRender=!ready||JSON.stringify(nextBox.payload)!==JSON.stringify(box.payload);
          box=nextBox;write(accountKey(uid),box);ready=true;
          if(shouldRender){window.setPlannerData?.(box.payload);changed();}
        }
        message=window.vowloDraft?'Editing · cloud refresh paused':'Up to date';
      }
    }catch(e){if(token===epoch)message='Sync unavailable. '+(e.message||'Check your connection and retry.');}
    finally{if(token===epoch){busy=false;notify();}}
    if(token===epoch && box?.dirty && !conflict && serial!==startSerial)setTimeout(()=>void sync(),0);
  }
  async function resolve(which){
    if(!conflict||busy)return;
    if(which==='local'){
      if(!confirm('Replace the cloud copy with this device’s copy? Export both copies first if you need them.'))return;
      box.revision=conflict.remote?.revision||0;box.dirty=true;
    }else{
      if(!confirm('Discard this device’s pending changes and use the cloud copy? Export a backup first.'))return;
      box={payload:conflict.remote?model.normalize(conflict.remote.payload):model.empty(),revision:conflict.remote?.revision||0,dirty:false};
    }
    write(accountKey(user.id),box);conflict=null;serial++;window.setPlannerData?.(box.payload);changed();await sync();
  }
  function download(value,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function exportRemote(){if(conflict)download(conflict.remote?.payload||model.empty(),'vowlo-cloud-conflict.json');}
  function exportLegacy(){try{download(read('vowloData')||read(localKey)||model.empty(),'vowlo-original-device-data.json');}catch{const raw=localStorage.getItem('vowloData')||'';download({unreadableOriginal:raw},'vowlo-original-recovery.json');}}
  function hasLegacy(){try{return !!(localStorage.getItem(localKey)||localStorage.getItem('vowloData'));}catch{return false;}}
  async function migrateLocal(){
    if(!ready||!user||busy||conflict)throw Error('Wait for sync or resolve the conflict first.');
    if(box.dirty)throw Error('Sync your current changes before importing.');
    if(!confirm('Import this browser’s device-only planner into this account? This replaces the account planner. The original device data stays untouched.'))return;
    const imported=model.normalize(read(localKey)||read('vowloData'));
    download(box.payload,'vowlo-before-migration.json');
    save(imported);window.setPlannerData?.(imported);changed();
  }
  async function auth(action,email,password){
    if(!client)throw Error('Cloud accounts are not enabled yet.');
    if(!navigator.onLine)throw Error('Connect to the internet to manage your account.');
    const redirect=new URL('./',location.href).href;
    let result;
    if(action==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect}});
    if(action==='login')result=await client.auth.signInWithPassword({email,password});
    if(action==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect+'?recovery=1'});
    if(action==='password')result=await client.auth.updateUser({password});
    if(result?.error)throw result.error;
    if(action==='password'){recovery=false;history.replaceState({},'',location.pathname);}
    return action==='signup'?'Check your email to confirm your account.':action==='reset'?'If an account exists, a reset link will arrive by email.':action==='password'?'Password updated.':'Signed in.';
  }
  async function logout(){
    if(busy)throw Error('Wait for the current request to finish.');
    if(box?.dirty||conflict)throw Error('Sync or export pending changes before signing out. To discard them, use the cloud copy first.');
    if(!confirm('Sign out and remove this account’s saved planner from this device?'))return;
    const uid=user?.id;
    const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;
    if(uid)localStorage.removeItem(accountKey(uid));
    await attach(null,'SIGNED_OUT');
  }
  async function deleteAccount(password){
    if(!user||busy||conflict)throw Error('Wait for sync or resolve your conflict first.');
    if(!password)throw Error('Enter your current password to delete your account.');
    if(!confirm('Permanently delete this account and its cloud planner? This cannot be undone. Export a backup first.'))return;
    const uid=user.id;
    const {error}=await client.auth.signInWithPassword({email:user.email,password});if(error)throw error;
    const {error:deleteError}=await client.rpc('delete_my_account');if(deleteError)throw deleteError;
    localStorage.removeItem(accountKey(uid));
    await client.auth.signOut({scope:'local'});await attach(null,'SIGNED_OUT');
  }
  function eraseDeviceData(){
    if(!confirm('Permanently remove this browser’s original V3 and device-only V4 data? This does not delete your cloud account. Export a backup first.'))return;
    localStorage.removeItem('vowloData');localStorage.removeItem(localKey);localError='';
    if(!user)window.setPlannerData?.(model.empty());changed();
  }
  async function init(){
    if(!cfg.cloudEnabled){message='Device-only mode · cloud not configured';notify();return;}
    try{
      // A V3 worker cached arbitrary GETs. Never start authenticated traffic under it.
      if(navigator.serviceWorker?.controller){
        const safeWorker=await new Promise(resolve=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();resolve(false);},1500);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.privateNetworkBypass===true);};navigator.serviceWorker.controller.postMessage({type:'PRIVACY_CHECK'},[channel.port2]);});
        if(!safeWorker)throw Error('Update the app and reload before signing in. An older offline cache is still active.');
      }
      if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl))throw Error('Invalid Supabase project URL.');
      let publicKey=cfg.supabaseKey?.startsWith('sb_publishable_');
      if(!publicKey){try{publicKey=JSON.parse(atob(cfg.supabaseKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}}
      if(!publicKey)throw Error('Only a public publishable or anon key is allowed.');
      client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{storageKey:'vowlo.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'},global:{fetch:async(url,options={})=>{
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
        try{return await fetch(url,{...options,signal:options.signal||controller.signal,cache:'no-store'});}finally{clearTimeout(timer);}
      }}});
      client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>void attach(session,event),0);});
      const {data,error}=await client.auth.getSession();if(error)throw error;
      await attach(data.session,'INITIAL_SESSION');
      setInterval(()=>{if(document.visibilityState==='visible')void sync();},20000);
      window.addEventListener('online',()=>void sync());
      window.addEventListener('offline',()=>{message='Offline · changes stay on this device';notify();});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void sync();});
    }catch(e){message='Cloud could not start. '+e.message;notify();}
  }
  // Never silently combine local edits from two tabs on the same device.
  window.addEventListener('storage',e=>{
    if(e.key===(user?accountKey(user.id):localKey) || e.key==='vowlo.auth'){
      localError='This planner changed in another tab. Export any unsaved work, then reload this tab.';changed();notify();
    }
  });
  return {loadLocal,save,editable,status,init,sync,resolve,exportRemote,exportLegacy,hasLegacy,migrateLocal,auth,logout,deleteAccount,eraseDeviceData};
})();
