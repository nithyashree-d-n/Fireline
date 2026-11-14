import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const today = new Date();
const todayIso = today.toISOString().slice(0,10);
const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
const land = {type:'FeatureCollection',features:[
  [[-168,70],[-140,70],[-125,55],[-130,48],[-117,32],[-105,22],[-96,18],[-83,8],[-78,8],[-80,25],[-97,29],[-105,49],[-123,49],[-130,58],[-150,60],[-168,70]],
  [[-81,12],[-69,10],[-50,-3],[-35,-8],[-48,-28],[-55,-55],[-72,-48],[-78,-20],[-81,12]],
  [[-18,36],[-7,37],[10,35],[30,31],[43,12],[50,-12],[38,-35],[20,-35],[10,-18],[-2,-5],[-17,15],[-18,36]],
  [[-10,36],[-9,58],[3,71],[28,70],[38,58],[30,46],[15,36],[-10,36]],
  [[28,70],[55,75],[90,72],[130,62],[160,60],[178,52],[150,45],[136,35],[122,22],[110,5],[100,10],[86,22],[68,25],[58,35],[45,40],[36,52],[28,70]],
  [[112,-11],[153,-12],[154,-27],[140,-39],[118,-34],[112,-11]],
  [[-52,60],[-40,60],[-22,70],[-28,82],[-45,83],[-54,72],[-52,60]]
].map(coords=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[coords.map(([x,y])=>[x,y])]}}))};
const demo = (() => {
  const hotspots = [];
  for (let year = 2001; year <= today.getFullYear(); year++) for (let month = 1; month <= (year===today.getFullYear()?today.getMonth()+1:12); month++) {
    const base = Math.max(0, Math.round((15 + 12*Math.sin((month-1)*Math.PI/6) + ((year*month*7)%23)) * (year > 2012 ? 1.04 : 0.92)));
    const event = ((year * 17 + month * 9) % 37 === 0) ? 3.1 : 1;
    const n = Math.round(base * event);
    for (let i = 0; i < n; i++) {
      const regions = [[-62,-9],[-52,-6],[24,1],[102,14],[-121,45],[135,-24],[30,52]];
      const [x,y] = regions[(i + year + month) % regions.length];
      const jitter = (k) => ((Math.sin(year*19 + month*31 + i*7 + k)*10000)%1)*2.5;
      const dayLimit=year===today.getFullYear()&&month===today.getMonth()+1?today.getDate():new Date(year,month,0).getDate();
      const day = 1 + ((i*7 + month*3) % dayLimit);
      hotspots.push({sensor:year < 2012?'MODIS':(i%3?'VIIRS':'MODIS'),satellite:year<2012?'Terra':'Suomi-NPP',acq_date:`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,acq_time:'1200',lat:y+jitter(1),lon:x+jitter(2),frp:Math.round((4+(i*13)%220)*10)/10,calibrated_frp:Math.round((4+(i*13)%220)*10)/10,confidence_norm:i%4?'nominal':'high',hotspot_count:1,hfai:1,cell_id:`demo-${year}-${month}-${i}`});
    }
  }
  const months = [];
  for(let year=2001;year<=2026;year++) for(let month=1;month<=12;month++){
    const count=hotspots.filter(h=>+h.acq_date.slice(0,4)===year && +h.acq_date.slice(5,7)===month).length;
    const values=Array.from({length:year-2001},(_,i)=>hotspots.filter(h=>+h.acq_date.slice(0,4)===2001+i && +h.acq_date.slice(5,7)===month).length).sort((a,b)=>a-b);
    const median=values.length?values[Math.floor(values.length/2)]:count;
    months.push({year,month,count,hfai:count,median_hfai:median,anomaly_pct:median?Math.round((count-median)/median*100):0});
  }
  return {demo:true,grid:'illustrative preview',hotspots,months,overlap:{scaling:{MODIS:1,VIIRS:1},cell_days:{MODIS:0,VIIRS:0}}};
})();

function App(){
  setWorkerUrl(workerUrl);
  const [data,setData]=useState(demo); const [bbox,setBbox]=useState([-180,-90,180,90]);
  const [from,setFrom]=useState('2001-01-01'); const [to,setTo]=useState(todayIso);
  const [anomaly,setAnomaly]=useState(false); const [metric,setMetric]=useState('count'); const [notice,setNotice]=useState('');
  const mapEl=useRef(null),mapRef=useRef(null);
  useEffect(()=>{fetch('/app_data.json').then(r=>r.ok?r.json():null).then(d=>{if(d?.hotspots?.length)setData(d)}).catch(()=>{});},[]);
  const allPoints=useMemo(()=>data.hotspots.filter(h=>h.lon>=bbox[0]&&h.lon<=bbox[2]&&h.lat>=bbox[1]&&h.lat<=bbox[3]),[data,bbox]);
  const points=useMemo(()=>allPoints.filter(h=>h.acq_date>=from&&h.acq_date<=to),[allPoints,from,to]);
  const months=useMemo(()=>{const a=new Map(); for(const r of points){const key=r.acq_date.slice(0,7),value=metric==='count'?Number(r.hotspot_count||1):Number(r.hfai||1);a.set(key,(a.get(key)||0)+value);} return a;},[points,metric]);
  const monthHfai=useMemo(()=>{const a=new Map();for(const r of points){const key=r.acq_date.slice(0,7);a.set(key,(a.get(key)||0)+Number(r.hfai||1));}return a;},[points]);
  const baseline=useMemo(()=>{const yearsByMonth=new Map();for(const r of allPoints){const month=+r.acq_date.slice(5,7),year=+r.acq_date.slice(0,4),slot=`${year}-${String(month).padStart(2,'0')}`,a=yearsByMonth.get(slot)||{year,month,value:0};a.value+=Number(r.hfai||1);yearsByMonth.set(slot,a);}const result=new Map();for(const {year,month} of yearsByMonth.values()){const values=[...yearsByMonth.values()].filter(x=>x.month===month&&x.year!==year).map(x=>x.value).sort((a,b)=>a-b);const mid=values.length?values[Math.floor(values.length/2)]:0;const mean=values.length?values.reduce((s,x)=>s+x,0)/values.length:0;const std=values.length?Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/values.length):0;result.set(`${year}-${String(month).padStart(2,'0')}`,{median:mid,std,anomaly_pct:mid?((yearsByMonth.get(`${year}-${String(month).padStart(2,'0')}`).value-mid)/mid)*100:null,z_score:std?(yearsByMonth.get(`${year}-${String(month).padStart(2,'0')}`).value-mid)/std:null});}return result;},[allPoints]);
  const years=useMemo(()=>{const all=[...data.months.map(x=>x.year),...points.map(x=>+x.acq_date.slice(0,4))]; const lo=Math.max(2001,Math.min(...all,2001)),hi=Math.max(...all,2026);return Array.from({length:hi-lo+1},(_,i)=>lo+i)},[data,points]);
  const max=Math.max(1,...months.values()); const peak=names.map((_,i)=>[i+1,[...months].filter(([k])=>+k.slice(5)===i+1).reduce((s,[,v])=>s+v,0)]).sort((a,b)=>b[1]-a[1])[0];const latestKey=[...months.keys()].sort().at(-1);const latestStats=latestKey?baseline.get(latestKey):null;const latestValue=latestKey?(monthHfai.get(latestKey)||0):0;
  useEffect(()=>{
    if(!mapEl.current||mapRef.current)return;
    const fallbackStyle={version:8,sources:{},layers:[{id:'base',type:'background',paint:{'background-color':'#172226'}}]};
    const style=mapboxToken?`https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${encodeURIComponent(mapboxToken)}`:fallbackStyle;
    const map=new MapLibreMap({container:mapEl.current,style,center:[0,13],zoom:0.35,attributionControl:false,dragRotate:false});
    map.addControl(new NavigationControl({showCompass:false}),'top-right');
    map.on('load',()=>{map.addSource('land',{type:'geojson',data:land});map.addLayer({id:'land',type:'fill',source:'land',paint:{'fill-color':'#263a36','fill-outline-color':'#52655b'}});map.addSource('fires',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'fires',type:'circle',source:'fires',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2,5,6],'circle-color':'#ffae5c','circle-opacity':0.78,'circle-stroke-width':0.5,'circle-stroke-color':'#fff0d4'}});map.addSource('aoi',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'aoi-fill',type:'fill',source:'aoi',paint:{'fill-color':'#51c6a8','fill-opacity':0.13}});map.addLayer({id:'aoi-line',type:'line',source:'aoi',paint:{'line-color':'#51c6a8','line-width':2,'line-dasharray':[3,2]}});});
    map.on('click','fires',e=>{const p=e.features?.[0]?.properties;if(!p)return;const content=document.createElement('div');content.textContent=`${p.sensor} · ${p.satellite} · ${p.date}`;new Popup({closeButton:true}).setLngLat(e.lngLat).setDOMContent(content).addTo(map);});
    map.on('mouseenter','fires',()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave','fires',()=>{map.getCanvas().style.cursor='crosshair'});
    let start=null; const canvas=map.getCanvas();
    const xy=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
    const down=e=>{if(e.button!==0)return;start=map.unproject(xy(e));map.dragPan.disable();};
    const up=e=>{if(!start)return;const end=map.unproject(xy(e));const box=[Math.min(start.lng,end.lng),Math.min(start.lat,end.lat),Math.max(start.lng,end.lng),Math.max(start.lat,end.lat)];if(Math.abs(box[2]-box[0])>.15&&Math.abs(box[3]-box[1])>.15){setBbox(box);document.querySelectorAll('[data-coord]').forEach((el,i)=>el.value=box[i].toFixed(2));}start=null;map.dragPan.enable();};
    canvas.addEventListener('mousedown',down);window.addEventListener('mouseup',up);mapRef.current=map;
    return()=>{canvas.removeEventListener('mousedown',down);window.removeEventListener('mouseup',up);map.remove();mapRef.current=null};
  },[]);
  useEffect(()=>{const map=mapRef.current;if(!map)return;const update=()=>{if(map.getSource('fires'))map.getSource('fires').setData({type:'FeatureCollection',features:points.map(h=>({type:'Feature',geometry:{type:'Point',coordinates:[h.lon,h.lat]},properties:{date:h.acq_date,frp:h.frp,sensor:h.sensor||'Unknown',satellite:h.satellite||'Unknown'}}))}); if(map.getSource('aoi')){const [w,s,e,n]=bbox;map.getSource('aoi').setData({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]},properties:{}}]});}};if(map.isStyleLoaded())update();else map.once('load',update)},[points,bbox]);
  function applyCoords(){const values=[...document.querySelectorAll('[data-coord]')].map(e=>Number(e.value));if(values.every(Number.isFinite)&&values[0]>=-180&&values[2]<=180&&values[1]>=-90&&values[3]<=90&&values[0]<values[2]&&values[1]<values[3]){setBbox(values);mapRef.current?.fitBounds([[values[0],values[1]],[values[2],values[3]]],{padding:50,duration:500});}else setNotice('Enter valid west, south, east, north coordinates.');}
  function exportCsv(){const fields=['hotspot_id','sensor','satellite','acq_date','acq_time','lat','lon','cell_id','hotspot_count','calibrated_hotspot_count','hfai','frp','calibrated_frp','confidence_norm','brightness','bright_t31','scan','track','source_count','sensors_seen'];const summary=['aoi_west','aoi_south','aoi_east','aoi_north','filter_start','filter_end','filtered_cell_days','filtered_hfai_total','peak_month'];const header=[...fields,...summary];const cell=v=>`"${String(v??'').replaceAll('"','""')}"`;const rows=points.map(p=>[...fields.map(k=>p[k]??''),...bbox,from,to,points.length,totalHfai,names[(peak?.[0]||1)-1]].map(cell));const csv=[header.map(cell).join(','),...rows.map(r=>r.join(','))].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='harmonized_fire_activity.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);setNotice(`Exported ${points.length.toLocaleString()} filtered records.`);}
  const color=v=>{const t=Math.max(0,Math.min(1,v));const ramp=anomaly?['#2b83ba','#abdda4','#ffffbf','#fdae61','#d7191c']:['#ffffcc','#ffeda0','#feb24c','#f03b20','#bd0026'];const q=t*(ramp.length-1),i=Math.min(ramp.length-2,Math.floor(q)),f=q-i;const a=ramp[i].match(/[\da-f]{2}/gi).map(x=>parseInt(x,16)),b=ramp[i+1].match(/[\da-f]{2}/gi).map(x=>parseInt(x,16));return `rgb(${a.map((x,k)=>Math.round(x+(b[k]-x)*f)).join(',')})`};
  const recordsTotal=points.length; const totalHfai=points.reduce((a,p)=>a+Number(p.hfai||1),0); const mapMax=points.length?Math.max(...points.map(p=>p.frp||1)):1;
  return <main>
    <header className="topbar"><a className="brand" href="#"><span className="brandmark">F</span> FIRELINE <small>EARTH OBSERVATION</small></a><nav><a className="active" href="#calendar">Activity calendar</a><a href="#method">Methodology</a></nav><span className="live"><i/> HISTORICAL EXPLORER</span></header>
    {data.demo&&<div className="demoBanner"><b>DEMO PREVIEW</b> Synthetic hotspot points are shown because no FIRMS input files are present. Run the pipeline with NASA FIRMS CSVs to replace this preview.</div>}
    <section className="hero"><div><div className="eyebrow"><span/> NASA SPACE APPS CHALLENGE · 2026</div><h1>Burning activity,<br/><em>put into context.</em></h1><p>Explore harmonized MODIS and VIIRS fire detections. See where activity stands against the historical record, from seasonal rhythms to exceptional years.</p><div className="heroTags"><span>MODIS · 2001—PRESENT</span><span>VIIRS · 2012—PRESENT</span><span>0.05° GRID · DAILY</span></div></div><div className="heroStat"><span className="statLabel">AREA ACTIVITY</span><strong>{totalHfai.toLocaleString()}</strong><span>HFAI index units in selected window</span><div className="statRule"/><div className="statMini"><span>HOTSPOT CELL-DAYS</span><b>{recordsTotal.toLocaleString()}</b></div><div className="statMini"><span>PEAK MONTH</span><b>{names[(peak?.[0]||1)-1]}</b></div><div className="statMini"><span>OVERLAP CALIBRATION</span><b>2012 – 2023</b></div></div></section>
    <section className="workspace"><div className="sectionHead"><div><div className="eyebrow dark">01 / DEFINE YOUR AREA</div><h2>Choose a region to explore</h2></div><span className="hint">DRAG ON MAP TO DRAW A BOUNDING BOX</span></div>
      <div className="mapPanel"><div ref={mapEl} className="map" aria-label="Interactive fire activity map; drag to select an area of interest"/><div className="mapCaption"><span><i className="dot"/> Hotspot cell-day</span><span className="mapCoords">{bbox.map(v=>v.toFixed(1)).join('°, ')}°</span></div></div>
      <div className="filters"><div className="coordGroup"><label>WEST<input data-coord defaultValue="-180" aria-label="West longitude"/></label><label>SOUTH<input data-coord defaultValue="-90" aria-label="South latitude"/></label><label>EAST<input data-coord defaultValue="180" aria-label="East longitude"/></label><label>NORTH<input data-coord defaultValue="90" aria-label="North latitude"/></label><button className="outline" onClick={applyCoords}>Apply bounds</button></div><div className="dateGroup"><label>FROM<input type="date" value={from} min="2001-01-01" max={todayIso} onChange={e=>setFrom(e.target.value)}/></label><span>—</span><label>TO<input type="date" value={to} min="2001-01-01" max={todayIso} onChange={e=>setTo(e.target.value)}/></label></div></div>
    </section>
    <section className="calendarSection" id="calendar"><div className="sectionHead"><div><div className="eyebrow dark">02 / READ THE RECORD</div><h2>Burning activity calendar</h2><p className="subhead">Monthly activity across years in your selected area</p></div><div className="controls"><div className="segmented"><button className={metric==='count'?'selected':''} onClick={()=>setMetric('count')}>Cell-days</button><button className={metric==='hfai'?'selected':''} onClick={()=>setMetric('hfai')}>HFAI</button></div><button className={`anomaly ${anomaly?'selected':''}`} aria-pressed={anomaly} onClick={()=>setAnomaly(!anomaly)}><span className="toggle"/>{anomaly?'Anomaly view':'Compare anomaly'}</button></div></div>
      <div className="calendarWrap"><div className="calendar" role="grid" aria-label="Year by month fire activity heatmap"><div className="yearLabel"/><div className="months">{names.map(m=><span key={m}>{m}</span>)}</div>{years.map(y=><React.Fragment key={y}><div className="yearLabel">{y}</div><div className="cells">{names.map((m,i)=>{const key=`${y}-${String(i+1).padStart(2,'0')}`;const val=months.get(key)||0;const base=baseline.get(key)||0;const relative=anomaly?Math.max(0,Math.min(1,.5+.5*(val/Math.max(1,base)-1))):val/max;return <button key={m} className="cell" style={{'--cell':val?color(relative):'#eff0eb'}} title={`${m} ${y}: ${Math.round(val)} ${anomaly?'HFAI, area median '+Math.round(base):metric==='count'?'cell-days':'HFAI'}`} aria-label={`${m} ${y}: ${Math.round(val)} ${anomaly?'HFAI':'cell-days'}`} onClick={()=>{setFrom(`${y}-${String(i+1).padStart(2,'0')}-01`);setTo(`${y}-${String(i+1).padStart(2,'0')}-${new Date(y,i+1,0).getDate()}`)}}/>})}</div></React.Fragment>)}</div></div>
      <div className="legendRow"><span>{anomaly?'Below historical median':'Lower activity'}</span><div className={`gradient ${anomaly?'diverge':''}`}/><span>{anomaly?'Above historical median':'Higher activity'}</span><span className="legendNote">{anomaly?'Historical departure scale · RdYlBu':'Colorblind-safe intensity scale · YlOrRd'}</span></div>
      <div className="insightRow"><div><span className="eyebrow dark">SELECTED AREA SUMMARY</span><h3>{recordsTotal.toLocaleString()} <small>cell-days</small></h3><p>Unique 0.05° grid cells with detections after daily overpass deduplication.</p></div><div><span className="eyebrow dark">SEASONAL PEAK</span><h3>{names[(peak?.[0]||1)-1]} <small>is most active</small></h3><p>Highest cumulative harmonized activity in the selected date window.</p></div><div><span className="eyebrow dark">RECORD COVERAGE</span><h3>{years[0]} <small>— {years.at(-1)}</small></h3><p>{data.demo?'Illustrative preview only.':'Based on the loaded FIRMS archive.'} Areas without detections remain uncolored.</p></div></div>
      <div className="exportBar"><div><b>Take this analysis with you.</b><span>Download filtered harmonized detections as a CSV report.</span></div><button className="primary" onClick={exportCsv}>↓ &nbsp; Download harmonized CSV <span>({recordsTotal.toLocaleString()})</span></button></div>
    </section>
    <section id="method" className="method"><div className="eyebrow">03 / HOW TO READ THIS</div><h2>A shared scale for two sensors.</h2><p>Detections from MODIS and VIIRS are assigned to a common approximately 5 km daily grid. Multiple satellite passes in the same cell and UTC date count as one active cell-day; the strongest observation supplies FRP. Overlap-period activity rates scale VIIRS to a MODIS-equivalent index.</p><div className="methodCards"><div><b>01</b><strong>Normalize</strong><span>Standard FIRMS dates, coordinates, confidence, and radiative power.</span></div><div><b>02</b><strong>Deduplicate</strong><span>One cell-day per location; overlapping overpasses do not multiply activity.</span></div><div><b>03</b><strong>Compare</strong><span>Monthly values compared with same-month historical median.</span></div></div><p className="caveat">HFAI is an analytical index for relative activity, not a calibrated measure of burned area or fire intensity. Browse only what the archive contains.</p></section>
    <footer><span>FIRELINE · NASA FIRMS HARMONIZATION EXPLORER</span><span>For situational context · Not an operational fire alert system</span></footer>
    {notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss">×</button></div>}
  </main>
}

createRoot(document.getElementById('root')).render(<App/>);
