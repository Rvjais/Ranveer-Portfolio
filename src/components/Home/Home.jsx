import React from 'react'
import profilepic from '../../assets/profile.png'
import { Link } from 'react-router-dom'
import { FaInstagram, FaGithub} from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import { FaLinkedin } from "react-icons/fa";
import { icondata,projectData, games } from '../../assets/images';
import github from '../../assets/github.png';
import ecommerce from '../../assets/ecommercepc.webm';
import pooja from '../../assets/poojapc.webm';
import todo from '../../assets/todo.webm';
import gradient from'../../assets/gradient.webm'
import snake from '../../assets/snake.webm';
import '../Home/Home.css'

const Home = () => {



  return (
    <>
    <div className="img">
        <img src={profilepic} alt="" />
    </div>
<div className="text">
  <h1>
        Hi Im Ranveer, a
        <br />
        <span className='h1'> Web-Developer</span>
    </h1>
    <h2>About</h2>
    <div className="para">
<p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Doloremque ex, ut eius dicta at iure sapiente temporibus quae. Labore hic dolor quo, quod quidem porro quaerat dolores repellat? Officiis, et?</p>
    </div>
    <div className="links">
        <Link to='/about' >Learn More -{'>'} </Link>
    </div>
<div className="socials">
      <h1>
       let's
        <span className='h1'> Connect</span>
    </h1>
    <div className="socialcontainer">
      <a href="https://www.instagram.com/ran_veerjaiswal/?hl=en"><FaInstagram className='socialicon instaicon' /></a>
<a href="https://github.com/Rvjais">< FaGithub className='socialicon githubicon' /></a>
<a href="https://wa.me/918004505051?text=Hello%20there%2C%20I%20have%20a%20question."><BsWhatsapp className='socialicon whatsappicon' /></a>
<a href="https://www.linkedin.com/in/ranveer-jaiswal-966289238/"><FaLinkedin className='socialicon linkedinicon' /></a>

    </div>

</div>
</div>

<section>
     <div className="heading">
        
        <h1>
            <span className='h1' >//</span>
       My
        <span className='h1'> Tech Skills</span>
    </h1>
     </div>
    
    <div className="mapped-icon-list">
      {icondata.map((icon) => (
        <div key={icon.id} className="mapped-icon-card">
          {/* Dynamically render the icon component */}
          <icon.component size={icon.size} color={icon.color} />
          <span className="icon-label">{icon.label}</span>
          <p className="icon-description">{icon.description}</p>
        </div>
      ))}
    </div>
<div className="dmtext">
 <span className='dm' >Want to Collabe and build something Exciting?</span>
             <span className='dm2'>Contact me</span>
</div>
</section>

<section className='portfolio'>
   <div className="textportfolio">
    <span className="first">Take a Look at The </span>
    <br />
    <span className="second"> // Latest Projects I have done</span>
    <br />
<Link to='/project'>  <span className='browseprojects'><h1>Browse all Projects -{'>'}</h1></span> </Link> 
    
   </div>

    <div className="imgcontainer">
        <a href="https://github.com/Rvjais?tab=repositories"><img className='gitimg' src={github} alt="" /></a>
        <p>click on the image to see my github</p>
    </div>
    <div className="bottom">
      <div className="hire">
      <span className='dm' >Want to hire me?</span>
      <br />
      <a href=""> <span className='dm2' >Contact Here</span></a>
    </div>
    <div className="projects">

    <div className="project">
        <div className="player">
             <video loading="lazy" width="640" height="360" controls>
        <source src={ecommerce}  />
       
        Your browser does not support the video tag.
      </video>

        </div>
        <a href="">Visit Live site</a>
    </div>
    <div className="project">
        <div className="player">
             <video loading="lazy" className='video' width="640" height="360" controls>
        <source src={snake}  />
       
        Your browser does not support the video tag.
      </video>
      
        </div>
        <a href="">Visit Live site</a>
    </div>

     <div className="project">
        <div className="player">
             <video loading="lazy" width="150" height="310" controls>
        <source src={pooja}  />
       
        Your browser does not support the video tag.
      </video>
      
        </div>
        <a href="">Visit Live site</a>
    </div>
    </div>
    <div className="hire">
      <span className='dm' >Want to make Projects?</span>
      <br />
      <a href=""> <span className='dm2' >Contact Here</span></a>
    </div>

    </div>
    

</section>
     

    </>
  )
}

export default Home