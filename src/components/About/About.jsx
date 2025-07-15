import React from 'react'
import '../About/About.css'
import usr from '../../assets/user_icon.png'
import specs from '../../assets/specs.png'
import syst from '../../assets/syst.png'
import kip from '../../assets/kip.png'
import kip2 from '../../assets/kip2.png'
import strength from '../../assets/strength.png'
import strength2 from '../../assets/strength2.png' 
import dance from '../../assets/dance.webm'
import dance2 from '../../assets/dance2.webm'
import strengthvid from '../../assets/strength.webm'
const About = () => {
  return (
    <>
    <div className="container">
       <div className="top">
      <div className="left">
       <h1>Nice to Meet You Im,</h1>
       <span>RANVEER JAISWAL</span>
       <div className="paradiv">
<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum ut illo nobis quo molestias vitae odio ea dolores voluptate, eligendi ducimus quos! Id corrupti totam quidem et sequi? Odio, perferendis.</p>
       </div>
       
      </div>
      <div className="right">
     <img className='profilepic' src={usr} alt="" />
      </div>
    </div>
{/* bottom part  */}

    <div className="bottom">
      <div className="boxes">
        <div className="box">
                <div className="left">
          <img className='specs bottom-pic' src={specs} alt="" />
          <img className='specs bottom-pic' src={syst} alt="" />
        </div>
        <div className="right">
       <h2>System Specs</h2>
       <h3>System</h3>
       <p>DELL Latitude 400</p>
       <h3>CPU</h3>
       <p>Intel(R) Core(TM) i5-8365U (8) @ 4.10 GHz
</p>
    <h3>GPU:</h3>
    <p> Intel UHD Graphics 620 @ 1.10 GHz [Integrated]
</p>
        </div>
        </div>
        <div className="box">
               <div className="left">
                   <h2>Education and Academics</h2>
                  <p>I completed my Bachlors degree in Pharma from </p> 
                  <p>Krishnarpit Institute of Pharmacy From Prayagraj</p>
                  <p>Im From A medical Background but trying to get into field of tech</p>
                  <p>not from degree but by skills</p>
               </div>
               <div className="right">
                <img className='kip bottom-pic' src={kip} alt="" />
                <img className='kip bottom-pic' src={kip2} alt="" />
               </div>
        </div>
        <div className="box">
          <div className="left">
<img className='bottom-pic' src={strength} alt="" />
<img className='bottom-pic' src={strength2} alt="" />
          </div>
          <div className="right">
            <h3>Hobbies and Activities</h3>
            <p>I carry a lots of hobbies with me like</p>
            <p>Dancing,Gym,Coding,Singing,Guitar,Acrobatics </p>
             <p>and my personal favoriet playing Flute</p>
          </div>

        </div>
        </div>
        <div className="gallery">

          <h3>Video Gallery</h3>
         <div class="reels-container">
  <div class="reel-item">
    <div class="video-wrapper">
      <video src={dance} controls muted loop playsinline></video>
    </div>
    <p>Reel Title 1</p>
  </div>
  <div class="reel-item">
    <div class="video-wrapper">
      <video src={dance2} controls muted loop playsinline></video>
    </div>
    <p>Reel Title 2 - A bit longer description.</p>
  </div>
  <div class="reel-item">
    <div class="video-wrapper">
      <video src={strength} controls muted loop playsinline></video>
    </div>
    <p>Reel Title 3</p>
  </div>
  <div class="reel-item">
    <div class="video-wrapper">
      <video src={strengthvid} controls muted loop playsinline></video>
    </div>
    <p>Another Reel with a much longer title and description.</p>
  </div>
  <div class="reel-item">
    <div class="video-wrapper">
      <video src="your-reel-5.mp4" controls muted loop playsinline></video>
    </div>
    <p>Short Reel 5</p>
  </div>
  </div>
      </div>        
    </div>
    </div>
   


    </>
  )
}

export default About