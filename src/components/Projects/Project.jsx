import React from 'react'
import '../Projects/Project.css'
import {games, projectData } from '../../assets/images'
const Project = () => {
  return (
    <>
    <div className="container">
        <h1>Find all my projects Here</h1>
<div className="mapped-project-list">
      {projectData.map((project) => {
        const isVideo = typeof project.src === 'string' && /\.(webm|mp4|ogg)$/i.test(project.src);
        return (
          <div key={project.id} className="mapped-project-card">
            {/* Media preview */}
            {isVideo ? (
              <video
                className="project-media"
                controls
                playsInline
                preload="none"
                width="300"
                height="200"
              >
                <source src={project.src} />
                Your browser does not support the video tag.
              </video>
            ) : (
              project.src ? (
                <img
                  className="project-image"
                  src={project.src}
                  alt={project.label}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
              ) : null
            )}
            <span className="project-label">{project.label}</span>
            <p className="project-description">{project.description}</p>
            <a href={project.link}>Visit Live Site</a>
          </div>
        );
      })}
    </div>
 <h1>Some Fun games That i Made</h1>
<div className="mapped-project-list">
      {games.map((game) => {
        const isVideo = typeof game.src === 'string' && /\.(webm|mp4|ogg)$/i.test(game.src);
        return (
          <div key={game.id} className="mapped-project-card">
            {/* Media preview */}
            {isVideo ? (
              <video
                className="project-media"
                controls
                playsInline
                preload="none"
                width="300"
                height="200"
              >
                <source src={game.src} />
                Your browser does not support the video tag.
              </video>
            ) : (
              game.src ? (
                <img
                  className="project-image"
                  src={game.src}
                  alt={game.label}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
              ) : null
            )}
            <span className="project-label">{game.label}</span>
            <p className="project-description">{game.description}</p>
            <a href={game.link}>Visit Live Site</a>
          </div>
        );
      })}
    </div>
    </div>
    </>
  )
}

export default Project