export type Lang = 'es' | 'en';

export interface Item {
  title: string;
  meta?: string;
  tag?: string;
  bullets?: string[];
  href?: string;
}

export interface Room {
  id: string;
  nav: string;
  kicker: string;
  title: string;
  paragraphs?: string[];
  chips?: string[];
  items?: Item[];
}

export interface Ui {
  world: string;
  classic: string;
  hint: string;
  print: string;
  open: string;
  webglFail: string;
  designSide: string;
  codeSide: string;
  roomsNav: string;
  langLabel: string;
  brand: string;
}

export interface Content {
  ui: Ui;
  rooms: Room[];
}

const PORTFOLIO = 'https://yhordyarevalo.myportfolio.com';

const es: Content = {
  ui: {
    world: 'Mundo 3D',
    classic: 'CV clásico',
    hint: 'Desplázate, desliza o usa ↑ ↓ y W A S D para recorrer el pasillo',
    print: 'Imprimir o guardar en PDF',
    open: 'Abrir',
    webglFail: 'Tu navegador no puede mostrar el mundo 3D. Puedes ver mi CV clásico.',
    designSide: 'diseño',
    codeSide: 'código',
    roomsNav: 'Salas del currículum',
    langLabel: 'Idioma',
    brand: 'Yhordy Arevalo',
  },
  rooms: [
    {
      id: 'entrada',
      nav: 'Entrada',
      kicker: 'Especialista e-learning · Desarrollador full stack en formación',
      title: 'Yhordy Arevalo',
      paragraphs: [
        'Del diseño al código: un pasillo donde mi trabajo creativo se convierte en software.',
        'A la izquierda, el boceto. A la derecha, el código. Avanza para conocer mi recorrido.',
      ],
    },
    {
      id: 'sobre-mi',
      nav: 'Sobre mí',
      kicker: 'Diseñador multimedia · e-learning',
      title: 'Sobre mí',
      paragraphs: [
        'Soy un diseñador multimedia apasionado y creador de contenido e-learning, con una sólida experiencia en gráficos en movimiento y animaciones 2D. Combino la creatividad visual con la pedagogía efectiva para ofrecer experiencias de aprendizaje únicas y memorables.',
        'Domino la suite de Adobe y tengo un alto nivel en Articulate Storyline. Ahora me formo como programador full stack (DAM y DAW) y practico Angular para llevar esas experiencias al desarrollo web.',
      ],
      chips: [
        'Adobe Suite',
        'Articulate Storyline y Rise',
        'Gráficos en movimiento y animación 2D',
        'Diseño de contenido e-learning interactivo',
        'Pensamiento creativo y resolución de problemas',
        'Angular (en formación)',
      ],
    },
    {
      id: 'experiencia',
      nav: 'Experiencia',
      kicker: '2018 – 2025',
      title: 'Experiencia',
      items: [
        {
          title: 'Especialista en E-learning',
          meta: 'byLittle LLC · USA · 2024 – 2025',
          bullets: [
            'Diseño, desarrollo e implementación de soluciones digitales de aprendizaje: módulos de capacitación, producción multimedia, animaciones y presentaciones.',
            'Gestión de contenido en plataformas LMS, integración de herramientas interactivas y evaluación del impacto del aprendizaje.',
          ],
        },
        {
          title: 'Diseñador de contenidos E-learning',
          meta: 'Universidad Javeriana Cali · Colombia · 2024',
          bullets: [
            'Desarrollo de módulos de capacitación, producciones multimedia, animaciones, presentaciones y recursos gráficos.',
          ],
        },
        {
          title: 'Diseñador de contenido E-learning',
          meta: 'Eficacia S.A. · Colombia · 2020 – 2023',
          bullets: [
            'Creación de cursos e-learning interactivos y visualmente atractivos con Articulate Storyline.',
            'Integración de componentes multimedia: vídeos, infografías y animaciones.',
            'Colaboración con expertos en contenido para transformar temas complejos en materiales didácticos atractivos.',
            'Aseguramiento de accesibilidad y cumplimiento de normativas.',
          ],
        },
        {
          title: 'Diseñador de contenidos E-learning / Multimedia',
          meta: 'EH! Ideas · Argentina · 2018 – 2020',
          bullets: [
            'Desarrollo de contenido e-learning interactivo con Articulate Storyline y la suite de Adobe.',
          ],
        },
      ],
    },
    {
      id: 'formacion',
      nav: 'Formación',
      kicker: 'Del diseño al código',
      title: 'Formación',
      items: [
        {
          title: 'Desarrollo de Aplicaciones Multiplataforma (DAM)',
          meta: 'En curso · finalizo en 2027',
          tag: 'En curso',
        },
        {
          title: 'Desarrollo de Aplicaciones Web (DAW)',
          meta: 'En curso · finalizo en 2027',
          tag: 'En curso',
        },
        {
          title: 'Angular',
          meta: 'En formación',
          tag: 'En curso',
        },
        {
          title: 'Ingeniería Multimedia',
          meta: 'UNAD Colombia · 2020',
        },
        {
          title: 'Instructional Design Crash Course',
          meta: 'byLittle LLC · 2025',
        },
      ],
    },
    {
      id: 'proyectos',
      nav: 'Proyectos',
      kicker: 'Portfolio',
      title: 'Proyectos',
      paragraphs: ['Una selección de mi trabajo. El portfolio completo está en Myportfolio.'],
      items: [
        {
          title: 'Curso e-learning interactivo',
          meta: 'Articulate · ejemplo publicado',
          href: 'https://360.eu.articulate.com/review/content/efaac6fb-e3c0-4a0f-9fd2-f5b7a97415d9/review',
        },
        {
          title: 'Animación y motion graphics',
          meta: 'Logos, personajes 2D y 3D, entornos',
          href: `${PORTFOLIO}/animation`,
        },
        {
          title: 'Vídeos corporativos',
          meta: 'Vídeo',
          href: `${PORTFOLIO}/video`,
        },
        {
          title: 'Ilustración',
          meta: 'Ilustración digital',
          href: `${PORTFOLIO}/illustration`,
        },
        {
          title: 'Portfolio completo',
          meta: 'yhordyarevalo.myportfolio.com',
          href: `${PORTFOLIO}/`,
        },
      ],
    },
    {
      id: 'contacto',
      nav: 'Contacto',
      kicker: 'Hablemos',
      title: 'Contacto',
      paragraphs: ['¿Tienes un proyecto de e-learning, de diseño o de desarrollo web? Escríbeme.'],
      items: [
        {
          title: 'Email',
          meta: 'proyectosyhordy@gmail.com',
          href: 'mailto:proyectosyhordy@gmail.com',
        },
        {
          title: 'LinkedIn',
          meta: 'in/yhordy-arevalo',
          href: 'https://www.linkedin.com/in/yhordy-arevalo',
        },
        {
          title: 'Portfolio',
          meta: 'yhordyarevalo.myportfolio.com',
          href: `${PORTFOLIO}/`,
        },
      ],
    },
  ],
};

const en: Content = {
  ui: {
    world: '3D world',
    classic: 'Classic CV',
    hint: 'Scroll, swipe or use ↑ ↓ and W A S D to walk the corridor',
    print: 'Print or save as PDF',
    open: 'Open',
    webglFail: "Your browser can't display the 3D world. You can view my classic CV instead.",
    designSide: 'design',
    codeSide: 'code',
    roomsNav: 'Résumé rooms',
    langLabel: 'Language',
    brand: 'Yhordy Arevalo',
  },
  rooms: [
    {
      id: 'entrada',
      nav: 'Entrance',
      kicker: 'E-learning specialist · Full stack developer in training',
      title: 'Yhordy Arevalo',
      paragraphs: [
        'From design to code: a corridor where my creative work turns into software.',
        'Sketches on the left, code on the right. Move forward to explore my path.',
      ],
    },
    {
      id: 'sobre-mi',
      nav: 'About me',
      kicker: 'Multimedia designer · e-learning',
      title: 'About me',
      paragraphs: [
        "I'm a passionate multimedia designer and e-learning content creator with solid experience in motion graphics and 2D animation. I combine visual creativity with effective pedagogy to deliver unique, memorable learning experiences.",
        "I'm fluent in the Adobe suite and highly skilled in Articulate Storyline. I'm now training as a full stack developer (DAM and DAW) and practicing Angular to bring those experiences to web development.",
      ],
      chips: [
        'Adobe Suite',
        'Articulate Storyline and Rise',
        'Motion graphics and 2D animation',
        'Interactive e-learning content design',
        'Creative thinking and problem solving',
        'Angular (learning)',
      ],
    },
    {
      id: 'experiencia',
      nav: 'Experience',
      kicker: '2018 – 2025',
      title: 'Experience',
      items: [
        {
          title: 'E-learning Specialist',
          meta: 'byLittle LLC · USA · 2024 – 2025',
          bullets: [
            'Designed, developed and delivered digital learning solutions: training modules, multimedia production, animations and presentations.',
            'Managed content on LMS platforms, integrated interactive tools and measured learning impact.',
          ],
        },
        {
          title: 'E-learning Content Designer',
          meta: 'Universidad Javeriana Cali · Colombia · 2024',
          bullets: [
            'Developed training modules, multimedia productions, animations, presentations and graphic resources.',
          ],
        },
        {
          title: 'E-learning Content Designer',
          meta: 'Eficacia S.A. · Colombia · 2020 – 2023',
          bullets: [
            'Built interactive, visually engaging e-learning courses with Articulate Storyline.',
            'Integrated multimedia components: videos, infographics and animations.',
            'Worked with subject-matter experts to turn complex topics into engaging learning materials.',
            'Ensured accessibility and regulatory compliance.',
          ],
        },
        {
          title: 'E-learning / Multimedia Content Designer',
          meta: 'EH! Ideas · Argentina · 2018 – 2020',
          bullets: [
            'Developed interactive e-learning content with Articulate Storyline and the Adobe suite.',
          ],
        },
      ],
    },
    {
      id: 'formacion',
      nav: 'Education',
      kicker: 'From design to code',
      title: 'Education',
      items: [
        {
          title: 'Cross-platform Application Development (DAM)',
          meta: 'In progress · graduating in 2027',
          tag: 'In progress',
        },
        {
          title: 'Web Application Development (DAW)',
          meta: 'In progress · graduating in 2027',
          tag: 'In progress',
        },
        {
          title: 'Angular',
          meta: 'Currently learning',
          tag: 'In progress',
        },
        {
          title: 'Multimedia Engineering',
          meta: 'UNAD Colombia · 2020',
        },
        {
          title: 'Instructional Design Crash Course',
          meta: 'byLittle LLC · 2025',
        },
      ],
    },
    {
      id: 'proyectos',
      nav: 'Projects',
      kicker: 'Portfolio',
      title: 'Projects',
      paragraphs: ['A selection of my work. The full portfolio lives on Myportfolio.'],
      items: [
        {
          title: 'Interactive e-learning course',
          meta: 'Articulate · published example',
          href: 'https://360.eu.articulate.com/review/content/efaac6fb-e3c0-4a0f-9fd2-f5b7a97415d9/review',
        },
        {
          title: 'Animation and motion graphics',
          meta: 'Logos, 2D and 3D characters, environments',
          href: `${PORTFOLIO}/animation`,
        },
        {
          title: 'Corporate videos',
          meta: 'Video',
          href: `${PORTFOLIO}/video`,
        },
        {
          title: 'Illustration',
          meta: 'Digital illustration',
          href: `${PORTFOLIO}/illustration`,
        },
        {
          title: 'Full portfolio',
          meta: 'yhordyarevalo.myportfolio.com',
          href: `${PORTFOLIO}/`,
        },
      ],
    },
    {
      id: 'contacto',
      nav: 'Contact',
      kicker: "Let's talk",
      title: 'Contact',
      paragraphs: ['Have an e-learning, design or web development project? Get in touch.'],
      items: [
        {
          title: 'Email',
          meta: 'proyectosyhordy@gmail.com',
          href: 'mailto:proyectosyhordy@gmail.com',
        },
        {
          title: 'LinkedIn',
          meta: 'in/yhordy-arevalo',
          href: 'https://www.linkedin.com/in/yhordy-arevalo',
        },
        {
          title: 'Portfolio',
          meta: 'yhordyarevalo.myportfolio.com',
          href: `${PORTFOLIO}/`,
        },
      ],
    },
  ],
};

export const CONTENT: Record<Lang, Content> = { es, en };

/* ------------------------------------------------------------------ */
/* Textos de la escena 3D (tooltips, mensajes y pantallas)             */
/* ------------------------------------------------------------------ */

export interface SceneText {
  /** Etiqueta flotante al pasar el ratón por cada zona. */
  tips: Record<string, string>;
  /** Mensajes graciosos al tocar objetos (se reparten por turnos). */
  eggs: Record<string, string[]>;
  lampOn: string;
  lampOff: string;
  screens: {
    experience: string;
    education: string;
    projects: string;
    contact: string;
    open: string;
    hello: string;
    reply: string;
    posterTop: string;
    posterBottom: string;
  };
  hint: string;
  closePanel: string;
  openPanel: string;
}

export const SCENE_TEXT: Record<Lang, SceneText> = {
  es: {
    tips: {
      eyes: 'Sobre mí',
      head: 'El pelo',
      monitor: 'Experiencia',
      laptop: 'Formación',
      tablet: 'Proyectos',
      phone: 'Contacto',
      lamp: 'La luz',
      plant: 'La planta',
      mug: 'El café',
      poster: 'El póster',
    },
    eggs: {
      eyes: [
        '¡Hola! Sí, te estoy viendo.',
        'Parpadeo mucho cuando programo.',
        'Estos ojos llevan horas frente a pantallas.',
        'Pista: prueba también con la lámpara.',
      ],
      head: ['¡Cuidado con el flequillo!', 'Hoy el pelo va por libre.', 'Ya me peiné, de verdad.'],
      plant: ['Está viva. De momento.', 'Riego pendiente, como los tests.', 'Fotosíntesis y deploy.'],
      mug: ['Café número tres. Ya compila.', 'Nivel de cafeína: óptimo.', 'Todavía está caliente.'],
      poster: ['Del diseño al código: de eso va todo esto.', 'Boceto a la izquierda, código a la derecha.'],
    },
    lampOn: 'Luz encendida.',
    lampOff: 'Luz apagada. Modo cine.',
    screens: {
      experience: 'experiencia',
      education: 'formacion',
      projects: 'proyectos',
      contact: 'Contacto',
      open: 'ver experiencia',
      hello: 'Hola',
      reply: 'Hablemos',
      posterTop: 'Del diseño',
      posterBottom: 'al código',
    },
    hint: 'Desplázate para recorrer la escena. Toca los ojos, las pantallas y los objetos.',
    closePanel: 'Ocultar panel',
    openPanel: 'Mostrar panel',
  },
  en: {
    tips: {
      eyes: 'About me',
      head: 'The hair',
      monitor: 'Experience',
      laptop: 'Education',
      tablet: 'Projects',
      phone: 'Contact',
      lamp: 'The light',
      plant: 'The plant',
      mug: 'The coffee',
      poster: 'The poster',
    },
    eggs: {
      eyes: [
        "Hi! Yes, I can see you.",
        'I blink a lot when I code.',
        'These eyes have spent hours in front of screens.',
        'Hint: try the lamp too.',
      ],
      head: ['Careful with the fringe!', 'Hair has a mind of its own today.', 'I did comb it, really.'],
      plant: ["It's alive. For now.", 'Watering is pending, like my tests.', 'Photosynthesis and deploys.'],
      mug: ['Coffee number three. It compiles now.', 'Caffeine level: optimal.', "It's still hot."],
      poster: ["From design to code: that's what this is about.", 'Sketches on the left, code on the right.'],
    },
    lampOn: 'Light on.',
    lampOff: 'Light off. Movie mode.',
    screens: {
      experience: 'experience',
      education: 'education',
      projects: 'projects',
      contact: 'Contact',
      open: 'view experience',
      hello: 'Hi',
      reply: "Let's talk",
      posterTop: 'From design',
      posterBottom: 'to code',
    },
    hint: 'Scroll to explore the scene. Touch the eyes, the screens and the objects.',
    closePanel: 'Hide panel',
    openPanel: 'Show panel',
  },
};
