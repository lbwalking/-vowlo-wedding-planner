/* Data boundary shared by local restore, migration and cloud reads. */
window.VowloModel = (() => {
  const lists = ['tasks','guests','expenses','vendors','timeline','tables','gifts','venues','photos','music','honeymoon','emergency','inspiration','contacts'];
  const empty = () => Object.fromEntries([['version',4],['setup',{names:'',date:'',budget:0,currency:'USD',venue:'',guestLimit:0}],...lists.map(k=>[k,[]])]);
  function normalize(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !input.setup || typeof input.setup !== 'object' || Array.isArray(input.setup) || !Array.isArray(input.tasks) || !Array.isArray(input.guests)) throw Error('This is not a Vowlo backup.');
    if (input.version && ![1,2,3,4].includes(input.version)) throw Error('This backup uses an unsupported version.');
    if (JSON.stringify(input).length > 2000000) throw Error('Backup exceeds the 2 MB limit.');
    const out = empty();
    function safeObject(obj) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw Error('Invalid record in backup.');
      const dest = {};
      for (const [key,value] of Object.entries(obj)) {
        if (['__proto__','constructor','prototype'].includes(key)) throw Error('Invalid field in backup.');
        if (value !== null && !['string','number','boolean'].includes(typeof value)) throw Error('Invalid field value in backup.');
        if (typeof value === 'string' && value.length > 10000) throw Error('A field is too long.');
        if (typeof value === 'number' && !Number.isFinite(value)) throw Error('Invalid number.');
        dest[key] = value;
      }
      return dest;
    }
    out.setup = {...out.setup,...safeObject(input.setup)};
    for (const key of lists) {
      if (input[key] !== undefined && !Array.isArray(input[key])) throw Error('Invalid '+key+' list.');
      if ((input[key]||[]).length > 10000) throw Error('Too many records.');
      out[key] = (input[key]||[]).map(row => {
        if (Array.isArray(row)) {
          if (key==='tasks') row={name:row[0],category:row[1]||'Planning',owner:'Both',due:'',done:!!row[2],status:row[2]?'Done':'To do'};
          else if (key==='guests') row={name:row[0],rsvp:row[1]||'Awaiting',household:'',table:''};
          else if (key==='expenses') row={item:row[0],category:'Other',estimate:+row[1]||0,final:+row[1]||0,paid:0};
        }
        const result=safeObject(row);
        const primary={tasks:'name',guests:'name',expenses:'item',vendors:'service',timeline:'time',tables:'name',gifts:'from',venues:'name',photos:'shot',music:'moment',honeymoon:'item',emergency:'item',inspiration:'category',contacts:'role'}[key];
        if(typeof result[primary]!=='string' || !result[primary].trim()) throw Error('Missing or invalid '+key+' name.');
        if(key==='expenses') for(const field of ['estimate','final','paid']) {
          if(result[field]!==null && result[field]!==undefined && (!Number.isFinite(Number(result[field])) || Number(result[field])<0)) throw Error('Invalid budget amount.');
        }
        if(key==='tables' && (!Number.isInteger(Number(result.capacity)) || Number(result.capacity)<1)) throw Error('Invalid table capacity.');
        if (key==='tasks') {result.done=!!result.done;result.status=result.done?'Done':'To do';result.due=String(result.due||'');}
        return result;
      });
    }
    if (!/^[A-Z]{3}$/.test(String(out.setup.currency))) out.setup.currency='USD';
    if (out.setup.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(out.setup.date))) throw Error('Invalid wedding date.');
    return out;
  }
  return {lists,empty,normalize};
})();
