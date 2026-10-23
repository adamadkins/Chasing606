import { SITE } from '../config/site';

function upsert(tag, keyAttribute, keyValue, valueAttribute, value) {
  let element = document.head.querySelector(`${tag}[${keyAttribute}="${keyValue}"]`);
  if (!element) {
    element = document.createElement(tag);
    element.setAttribute(keyAttribute, keyValue);
    document.head.appendChild(element);
  }
  element.setAttribute(valueAttribute, value);
}

const meta = (keyAttribute, keyValue, content) => upsert('meta', keyAttribute, keyValue, 'content', content);

/** Keeps the document head in step with the current page (client-side navigation). */
export function applyHead({ title, description, path, noindex = false }) {
  const url = SITE.url + path;
  document.title = title;
  meta('name', 'description', description);
  meta('name', 'robots', noindex ? 'noindex' : 'index, follow');
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', url);
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  upsert('link', 'rel', 'canonical', 'href', url);
}
