import React from 'react'
import '../Projects/Project.css'
import {games, projectData } from '../../assets/images'
const Project = () => {
  return (
    <>
    <div className="container">
        <h1>Find all my projects Here</h1>
<div className="mapped-project-list">
      {projectData.map((project) => (
        <div key={project.id} className="mapped-project-card">
          {/* Dynamically render the icon component */}
          <img src={project.src} alt="" />
          <span className="project-label">{project.label}</span>
          <p className="project-description">{project.description}</p>
          <a href={project.link}>Visit Live Site</a>
        </div>
      ))}
    </div>
 <h1>Some Fun games That i Made</h1>
<div className="mapped-project-list">
      {games.map((game) => (
        <div key={game.id} className="mapped-project-card">
          {/* Dynamically render the icon component */}
          <img src={game.src} alt="" />
          <span className="project-label">{game.label}</span>
          <p className="project-description">{game.description}</p>
          <a href={game.link}>Visit Live Site</a>
        </div>
      ))}
    </div>
    </div>
    </>
  )
}

export default Project