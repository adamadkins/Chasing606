import { useRef } from 'react';
import useReveal from '../hooks/useReveal';
import FeaturedGear from '../components/home/FeaturedGear';
import Hero from '../components/home/Hero';
import LatestVideo from '../components/home/LatestVideo';
import StorySection from '../components/home/StorySection';

export default function Home() {
  const page = useRef(null);
  useReveal(page);
  return (
    <div ref={page}>
      <Hero />
      <FeaturedGear />
      <LatestVideo />
      <StorySection />
    </div>
  );
}
