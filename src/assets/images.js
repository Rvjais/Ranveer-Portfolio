import { FaReact } from "react-icons/fa";
import { FaNodeJs } from "react-icons/fa";
import { FaBootstrap } from "react-icons/fa";
import { RiTailwindCssLine } from "react-icons/ri";
import { DiMongodb } from "react-icons/di";
import { SiExpress } from "react-icons/si";
import { IoLogoJavascript } from "react-icons/io";
import { FaJava } from "react-icons/fa";
import { DiLinux } from "react-icons/di";
import { IoLogoWindows } from "react-icons/io";
import { FaFigma } from "react-icons/fa";

const icondata = [
  {
    id: 'react',
    component: FaReact,
    label: 'React',
    description: 'A frontend library for building user interfaces.',
    color: '#61DAFB',
    size: '3em'
  },
  {
    id: 'nodejs',
    component: FaNodeJs,
    label: 'Node.js',
    description: 'A JavaScript runtime environment for server-side applications.',
    color: '#68A063',
    size: '3em'
  },
  {
    id: 'bootstrap',
    component: FaBootstrap, // Corrected to FaBootstrap
    label: 'Bootstrap',
    description: 'A powerful, feature-packed frontend toolkit for responsive web design.',
    color: '#7952B3',
    size: '3em'
  },
  {
    id: 'tailwindcss',
    component: RiTailwindCssLine,
    label: 'Tailwind CSS',
    description: 'A utility-first CSS framework for rapidly building custom designs.',
    color: '#38B2AC',
    size: '3em'
  },
  {
    id: 'mongodb',
    component: DiMongodb,
    label: 'MongoDB',
    description: 'A NoSQL document database known for scalability and flexibility.',
    color: '#47A248',
    size: '3em'
  },
  {
    id: 'express',
    component: SiExpress,
    label: 'Express.js',
    description: 'A fast, unopinionated, minimalist web framework for Node.js.',
    color: '#000000', // Express logo is often black
    size: '3em'
  },
  {
    id: 'javascript', // Added JavaScript
    component: IoLogoJavascript,
    label: 'JavaScript',
    description: 'The programming language of the web, enabling interactive content.',
    color: '#F7DF1E',
    size: '3em'
  },
  {
    id: 'java', // Added Java
    component: FaJava,
    label: 'Java',
    description: 'A widely-used, class-based, object-oriented programming language.',
    color: '#007396',
    size: '3em'
  },
  {
    id: 'linux', // Added Linux
    component: DiLinux,
    label: 'Linux',
    description: 'A family of open-source Unix-like operating systems.',
    color: '#FCC624', // Common Linux Tux color
    size: '3em'
  },
  {
    id: 'windows-os', // Added Windows OS
    component: IoLogoWindows,
    label: 'Windows OS',
    description: 'The ubiquitous operating system by Microsoft.',
    color: '#0078D4',
    size: '3em'
  },{
    id: 'figma', 
    component: FaFigma,
    label: 'Figma',
    description: 'A software to build unique interface design',
    color: 'white',
    size: '3em'
  }
];


export default icondata;