import React from 'react'
import '../About/About.css'
import usr from '../../assets/user_icon.png'
import specs from '../../assets/specs.png'
import syst from '../../assets/syst.png'
import kip from '../../assets/kip.png'
import kip2 from '../../assets/kip2.png'
const About = () => {
  return (
    <>
    
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
          <img className='specs' src={specs} alt="" />
          <img className='specs' src={syst} alt="" />
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
                <img className='kip' src={kip} alt="" />
                <img className='kip' src={kip2} alt="" />
               </div>
        </div>
        <div className="box">
          <div className="left">

          </div>
          <div className="right">
            <h3>Hobbies and Activities</h3>
            <p>I carry a lots of hobbies with me like</p>
            <p>Dancing,Gym,Coding,Singing,Guitar,Acrobatics </p>
             <p>and my personal favoriet playing Flute</p>
          </div>

        </div>

      </div>
        
    </div>


    </>
  )
}

export default About