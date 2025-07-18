import React from 'react'
import Navbar from './components/Navbar/Navbar'
import Home from './components/Home/Home'
import About from './components/About/About'
import CustomCursor from './components/CustomCursor/CustomCursor'
import { Routes, Route } from 'react-router-dom'; 
import '../src/App.css'
import Project from './components/Projects/Project';
const App = () => {
  return (
    <>
    <Navbar/>
     <Routes>
        {/* A <Route> for each path */}
        <Route path ="/Ranveer-Portfolio" element={<Home />} />
        <Route path ="/Ranveer-Portfolio/about" element={<About />} />
        <Route path = "/Ranveer-Portfolio/project" element={<Project/>} /> 
      </Routes>
        <CustomCursor />
    </>
  )
}

export default App