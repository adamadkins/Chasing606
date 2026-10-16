import React from 'react';

export default function StoryHeadline({ as: Heading = 'h2', id, ending = 'outdoors.', reduceMotion = false }) {
  return (
    <Heading id={id} className="story-rotating-headline">
      Every good story<br />
      starts{' '}
      <span className="story-ending-slot">
        <em key={ending} className={reduceMotion ? '' : 'story-ending-enter'}>{ending}</em>
      </span>
    </Heading>
  );
}
