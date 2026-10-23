import { useEffect, useRef } from 'react';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import Intro from './components/layout/Intro';
import { CatalogProvider } from './hooks/useCatalog';
import { applyHead } from './lib/head';
import { Router, useRouter } from './lib/router';
import About from './pages/About';
import Contact from './pages/Contact';
import Developer from './pages/Developer';
import Home from './pages/Home';
import Legal from './pages/Legal';
import Merch from './pages/Merch';
import NotFound from './pages/NotFound';
import { LEGAL_PAGES } from './data/legal';

const TITLE_SUFFIX = ' | Chasing 606';

const ROUTES = {
  '/': {
    Page: Home,
    title: 'Chasing 606 | Kentucky Hunting Videos & Gear',
    description: 'Hunting suburban giants from the heart of 606. Explore the channel, outdoor stories, and gear collection.'
  },
  '/merch': {
    Page: Merch,
    title: `Merch${TITLE_SUFFIX}`,
    description: 'Official Chasing 606 gear: shirts, hoodies, drinkware, and more for the woods and beyond.'
  },
  '/about': {
    Page: About,
    title: `Our Story${TITLE_SUFFIX}`,
    description: 'Meet Chasing 606, an eastern Kentucky hunting team telling the stories behind the hunt.'
  },
  '/contact': {
    Page: Contact,
    title: `Contact us${TITLE_SUFFIX}`,
    description: 'Questions about merch, our videos, or working together? Send Chasing 606 a message.'
  },
  '/behind-the-build': {
    Page: Developer,
    title: 'Contact the Developer | Adam Adkins',
    description: 'Adam Adkins designed and built the Chasing 606 website. Get in touch about your own project.'
  },
  ...Object.fromEntries(Object.entries(LEGAL_PAGES).map(([path, page]) => [path, {
    Page: () => <Legal path={path} />,
    title: `${page.title}${TITLE_SUFFIX}`,
    description: page.description
  }]))
};

// Old addresses that still work, redirecting to their current home.
const REDIRECTS = { '/story': '/about' };

const NOT_FOUND = {
  Page: NotFound,
  title: `Page not found${TITLE_SUFFIX}`,
  description: 'This page could not be found.',
  noindex: true
};

function Layout() {
  const { path, navigate } = useRouter();
  const main = useRef(null);
  const firstRender = useRef(true);

  const redirect = REDIRECTS[path];
  const route = ROUTES[redirect ?? path] ?? NOT_FOUND;

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect, navigate]);

  useEffect(() => {
    applyHead({ title: route.title, description: route.description, path: redirect ?? path, noindex: route.noindex });
    // After a client-side navigation, move keyboard and screen-reader focus to the new page.
    if (firstRender.current) firstRender.current = false;
    else main.current?.focus({ preventScroll: true });
  }, [route, path, redirect]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" ref={main} tabIndex={-1}>
        <route.Page />
      </main>
      <Footer />
      <Intro />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <CatalogProvider>
        <Layout />
      </CatalogProvider>
    </Router>
  );
}
