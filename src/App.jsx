import React from 'react'
import Navbar from './components/Navbar/Navbar'
import Home from './components/Home/Home'
import About from './components/About/About'
import { Routes, Route } from 'react-router-dom'; 
import '../src/App.css'
import Project from './components/Projects/Project';
const App = () => {
  return (
    <>
    <Navbar/>
     <Routes>
        {/* A <Route> for each path */}
        <Route path ="/" element={<Home />} />
        <Route path ="/about" element={<About />} />
        <Route path = "/project" element={<Project/>} /> 
      </Routes>
    </>
  )
}

export default App