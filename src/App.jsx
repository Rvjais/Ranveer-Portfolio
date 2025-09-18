import React, { useEffect } from 'react'
import Navbar from './components/Navbar/Navbar'
import Home from './components/Home/Home'
import About from './components/About/About'
import CustomCursor from './components/CustomCursor/CustomCursor'
import { Routes, Route } from 'react-router-dom'; 
import '../src/App.css'
import Project from './components/Projects/Project';
const App = () => {
  useEffect(() => {
    const requestAnyFullscreen = async (video) => {
      try {
        if (video.requestFullscreen) {
          await video.requestFullscreen();
        } else if (video.webkitEnterFullscreen) {
          // iOS Safari
          video.webkitEnterFullscreen();
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        } else if (video.mozRequestFullScreen) {
          video.mozRequestFullScreen();
        } else if (video.msRequestFullscreen) {
          video.msRequestFullscreen();
        }
      } catch (_) {
        // Ignore policy errors
      }
    };

    const onPlay = (e) => {
      const el = e.target;
      if (!el || el.tagName !== 'VIDEO') return;
      // Pause all other videos
      document.querySelectorAll('video').forEach((v) => {
        if (v !== el) v.pause();
      });
      // Try to enter fullscreen for the playing video
      requestAnyFullscreen(el);
    };

    document.addEventListener('play', onPlay, true);
    return () => document.removeEventListener('play', onPlay, true);
  }, []);
  return (
    <>
    <Navbar/>
     <Routes>
        {/* A <Route> for each path */}
        <Route path ="/" element={<Home />} />
        <Route path ="/about" element={<About />} />
        <Route path = "/project" element={<Project/>} /> 
      </Routes>
        <CustomCursor />
    </>
  )
}

export default App