'use client';

import {Compass, Globe2, Luggage} from 'lucide-react';

const workspaces = [
  {id:'recommendations', view:'bored', label:'وين أروح؟', icon:Compass},
  {id:'trip', view:'trip-card', label:'رحلتي', icon:Luggage},
  {id:'countries', view:'countries', label:'الدول', icon:Globe2},
] as const;

const tripTools = [
  ['desk','لوحة رحلتي'],
  ['review','مراجعة قبل الحجز'],
  ['places','الأماكن والجدولة'],
  ['map','خريطة الأنشطة'],
  ['ideas','أفكاري'],
  ['organize','توزيع الأماكن'],
  ['bookings','الحجوزات'],
  ['budget','الميزانية'],
  ['prices','متابعة الأسعار'],
  ['packing','شنطتي'],
  ['split','تقسيم المصاريف'],
  ['calendar','مواسم وعطلات الرحلة'],
  ['offline','بدون إنترنت'],
] as const;

type Workspace = typeof workspaces[number]['id'];

export function workspaceFor(view:string): Workspace | undefined {
  if (view==='settings') return undefined;
  if (view==='bored'||view==='ready-plans') return 'recommendations';
  return view==='countries' ? 'countries' : 'trip';
}

export function WorkspaceNavigation({workspace,onChange}: {workspace?:Workspace;onChange:(view:string)=>void}) {
  return <nav className="workspace-navigation" aria-label="التبويبات الرئيسية">
    <div className="navigation-groups">
      {workspaces.map(({id,view,label,icon:Icon})=><button type="button" key={id} className={workspace===id?'active':undefined}
        aria-current={workspace===id?'page':undefined} onClick={()=>onChange(view)}><Icon size={19} aria-hidden="true"/>{label}</button>)}
    </div>
  </nav>;
}

export function TripNavigation({view,hasReadyPlan,onChange}: {view:string;hasReadyPlan?:boolean;onChange:(view:string)=>void}) {
  const card = hasReadyPlan?['ready-trip','خطتي المحفوظة']:['trip-card','بطاقة السفرة'];
  const shortcuts = [card,['plan','خطتي اليومية'],['prep','قبل ما تطلع']];
  const tools = hasReadyPlan?[['trip-card','بطاقات الوجهات'],...tripTools]:tripTools;
  return <div className="trip-navigation" aria-label="أقسام الرحلة">
    <div className="trip-navigation-shortcuts">
      {shortcuts.map(([id,label])=><button type="button" key={id} className="secondary"
        aria-current={view===id?'location':undefined} onClick={()=>onChange(id)}>{label}</button>)}
    </div>
    <label>أدوات رحلتي
      <select value={tools.some(([id])=>id===view)?view:''} onChange={event=>{if(event.target.value)onChange(event.target.value);}}>
        <option value="">اختر أداة</option>
        {tools.map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select>
    </label>
  </div>;
}
