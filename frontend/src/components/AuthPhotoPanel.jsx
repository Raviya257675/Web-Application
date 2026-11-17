import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import './auth-photo.css';
import './auth-photo-layers.css';
const slides=[
  {image:'care.jpg',title:'Your wellbeing. Our shared purpose.',text:'Stay connected to your care, from your first appointment to your next step.'},
  {image:'doctor.jpg',title:'People first. Care that listens.',text:'A more personal hospital experience, with your care team closer at hand.'},
  {image:'team.jpg',title:'Together, through every stage.',text:'Appointments, prescriptions and results, brought together around you.'},
];
export default function AuthPhotoPanel({signup=false}){
 const [active,setActive]=useState(0);const [paused,setPaused]=useState(false);
 useEffect(()=>{if(paused||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setActive(i=>(i+1)%slides.length),6000);return()=>clearInterval(timer);},[paused]);
 return <aside className="auth__aside auth-photo-panel">
   <div className="auth-photo-images" aria-hidden="true">{slides.map((s,i)=><img key={s.image} src={'/photos/'+s.image} alt="" className={active===i?'is-active':''}/>)}</div>
   <div className="auth-photo-shade"/>
   <Link to="/" className="brand brand--lg auth-photo-brand"><span className="brand__mark">M</span><span>Meridian Hospital</span></Link>
   <div className="auth-photo-story"><span className="auth-photo-eyebrow">{signup?'YOUR CARE JOURNEY STARTS HERE':'WELCOME BACK TO MERIDIAN'}</span><h2>{slides[active].title}</h2><p>{slides[active].text}</p><div className="auth-photo-points"><span>✚ Compassionate care</span><span>Connected to you</span></div></div>
   <div className="auth-photo-bottom"><div className="auth-photo-controls" aria-label="Healthcare slideshow">{slides.map((s,i)=><button key={s.image} type="button" aria-label={`Show healthcare photo ${i+1}`} aria-pressed={active===i} onClick={()=>setActive(i)} />)}<button type="button" className="auth-photo-pause" onClick={()=>setPaused(!paused)} aria-label={paused?'Play healthcare slideshow':'Pause healthcare slideshow'}>{paused?'Play':'Pause'}</button></div><Link to="/">Explore our hospital ↗</Link></div>
 </aside>;
}
