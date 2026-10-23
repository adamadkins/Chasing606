import celebration from '../assets/images/story-celebration.webp';
import turkey from '../assets/images/story-turkey.webp';
import headlamp from '../assets/images/story-headlamp.webp';
import deerTrail from '../assets/images/story-deer-trail.webp';

// Each slide pairs a photo with the headline ending and copy shown beside it.
export const STORY_SLIDES = [
  {
    id: 'outdoors',
    ending: 'outdoors.',
    lead: "We spend a lot of time chasing mature whitetails around the 606. It's what gets us out of bed and into the woods.",
    detail: "There's nothing quite like seeing a good buck step into view.",
    photo: { src: celebration, alt: 'Hunters celebrating together beside a mature whitetail buck outdoors' }
  },
  {
    id: 'gobble',
    ending: 'with a gobble.',
    lead: "When spring rolls around, we're listening for gobbles and watching the timber wake up.",
    detail: 'Early mornings and a bird answering back are worth the alarm.',
    photo: { src: turkey, alt: 'Wild turkey displaying its fan in spring grass', position: 'center 65%' }
  },
  {
    id: 'before-daylight',
    ending: 'before daylight.',
    lead: 'Cold mornings, fresh sign, and a buck moving through the timber. That\'s why we put in the hours.',
    detail: 'Some sits are quiet. Others are the ones you remember.',
    photo: { src: headlamp, alt: 'Hunter heading into the woods with a headlamp before daylight' }
  },
  {
    id: 'on-the-trail',
    ending: 'on the trail.',
    lead: 'The work starts long before we climb into a stand. We scout, check trails, and learn the ground.',
    detail: 'We film what happens along the way, not just the highlights.',
    photo: { src: deerTrail, alt: 'Two whitetail deer standing together among the trees' }
  }
];
