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
import calcmobile from '../assets/calculatormobile.png'
import calcpc from '../assets/calculatorpc.png'
import ecompc from '../assets/ecommercepc.png'
import ecommobile from '../assets/ecommercemobile.png'
import geminipc from '../assets/geminipc.png'
import geminimobile from '../assets/geminiphone.png'
import gradientpc from '../assets/gradientpc.png'
import gradientmobile from '../assets/gradientmobile.png'
import ipod from '../assets/ipod.png'
import poojapc from '../assets/poojapc.png'
import poojamobile from '../assets/poojamobile.png'
import snake from '../assets/snakepc.png'
import stnpprscsrpc from '../assets/stnpprscsrpc.png'
import stnpprscsrmobile from '../assets/stnpprscsrmobile.png'
import tttpc from '../assets/tttpc.png'
import tttmobile from '../assets/tttmobile.png'
import todopc from '../assets/todopc.png'
import todomobile from '../assets/todomobile.png'
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


const projectData = [{
  id: 'gemini' ,
  src: geminipc,
  label: 'Gemini-Clone',
  description: 'A Clone of google gemini made with React.js and Gemini API ',
  link: 'https://rvjais.github.io/Gemini-clone'
},{
  id: 'ecommerce' ,
  src: ecompc,
  label: 'E-Commerce',
  description: 'An E-Commerce Site made by React,Tailwind and react-router' ,
  link: 'https://rvjais.github.io/Ecommerce'
},{
  id: 'pooja' ,
  src: poojapc,
  label: 'Pooja-Tech',
  description: 'A Website for Complete Infrastructure solutions for Hospital and Personal services  ',
  link: 'https://rvjais.github.io/PoojaTech/'
},{
   id: 'ipod' ,
  src: ipod,
  label: 'I-Pod Player',
  description: 'A Frontend Design of I-Pod Themed Music Player ',
  link: 'https://rvjais.github.io/I-pod-Player/'
},{
   id: 'todo' ,
  src: todopc,
  label: 'To-Do-List',
  description: ' A web app to take trackes of your tasks and habits',
  link: 'https://rvjais.github.io/to-do-list/'
},{
  id: 'gradient' ,
  src: gradientpc,
  label: 'Gradient-Generator',
  description: ' A beutifull website used for making random gradient colours for css with its colour code to copy ',
  link: 'https://rvjais.github.io/Gradient-generator/'
},{
  id: 'calc' ,
  src: calcpc,
  label: 'Calculator',
  description: ' An Intractive ui and functionality of a calculator',
  link: 'https://rvjais.github.io/Calculator/'
}];

const games = [{
  id: 'stnpprscr' ,
  src: '',
  label: 'Stone-Paper-Scissors',
  description: 'An intractive game made from javascript logic and beutifull ui design with the help of CSS',
  link: 'https://rvjais.github.io/Stone-paper-scissors/'
},{
 id: 'snake' ,
  src: '',
  label: 'Snake-Game',
  description: 'An intractive game made from javascript logic and beutifull ui design with the help of CSS',
  link: 'https://rvjais.github.io/SnakeGame/'
},{
  id: 'ttt' ,
  src: '',
  label: 'Tic-Tac-Toe',
  description: 'An intractive game made from javascript logic and beutifull ui design with the help of CSS',
  link: 'https://rvjais.github.io/tic-tac-toe/'
}];


export { icondata, projectData, games };




