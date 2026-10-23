import { SITE } from '../config/site';
import { Link } from '../lib/router';

const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>;
const external = (href, label) => <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>;

export const LEGAL_UPDATED = 'October 16, 2026';

// Each page: title, eyebrow, intro, and [heading, body] sections.
export const LEGAL_PAGES = {
  '/privacy': {
    title: 'Privacy policy',
    eyebrow: 'Your privacy matters',
    description: 'How Chasing 606 handles information when you browse, contact us, or shop.',
    intro: 'How Chasing 606 handles information when you browse, contact us, or shop.',
    sections: [
      ['Who operates this website', <>Chasing 606 operates this website. For privacy questions, contact {mail}.</>],
      ['Information you choose to share', <>When you email Chasing 606, we receive the contact information and message you send. The Chasing 606 contact form sends the name, email address, topic, and message you enter to FormSubmit, an external form delivery provider, for delivery to Chasing 606. The separate developer contact form at /behind-the-build also sends the details you enter to FormSubmit for delivery to Adam Adkins. FormSubmit processes submissions under its own policies; do not submit sensitive information. If you purchase merchandise, Spring handles checkout and order information on its own service.</>],
      ['Site operation', <>Our website hosting provider, Cloudflare, may process technical information such as IP address and request details to deliver the site and protect it from abuse. We do not collect payment card numbers through this website.</>],
      ['Other services', <>Product data and hosted checkout are provided by Spring. Our YouTube player loads third-party content when you choose to play a video. Links to YouTube and social sites take you to third-party services with their own privacy policies. See {external('https://formsubmit.co/privacy.pdf', 'FormSubmit\'s privacy statement')}, {external('https://spri.ng/policies/spring-privacy-policy', 'Spring\'s privacy policy')} and {external('https://policies.google.com/privacy', 'Google\'s privacy policy')}.</>],
      ['How we use information', <>We use information we receive to respond to inquiries, operate and improve the website, and address merchandise questions. Spring processes information needed for purchases under its own checkout and privacy terms.</>],
      ['Your choices and requests', <>For questions about Chasing 606 messages, contact {mail}. For developer inquiries sent through the separate contact form, contact its recipient using the address provided on that page's email fallback. For order data, contact Spring through the support options provided in your checkout or order confirmation. Applicable privacy rights may vary based on your location.</>],
      ['Children', <>Chasing 606 is intended for a general audience and does not knowingly solicit personal information from children under 13. If you believe a child has shared personal information with us, please contact {mail}.</>],
      ['Updates', <>We may update this policy when our website or service providers change. The date at the top of this page indicates the latest revision.</>]
    ]
  },
  '/terms': {
    title: 'Terms of use',
    eyebrow: 'Site information',
    description: 'Terms for browsing Chasing 606 content and using links to our merchandise store.',
    intro: 'Terms for browsing Chasing 606 content and using links to our merchandise store.',
    sections: [
      ['Using this website', <>You may browse this website for personal, lawful use. Do not attempt to interfere with its operation, misuse its content, or gain unauthorized access.</>],
      ['Ownership of content', <>Unless otherwise identified, Chasing 606 branding, photography, artwork, and original content belong to their respective owners and may not be commercially reused without permission. YouTube videos and other third-party materials are subject to their owners' terms.</>],
      ['Product information', <>We try to keep product descriptions, photos, pricing, and availability accurate. Product details and stock may change. The final order details, applicable taxes, delivery charges, and payment terms are presented by Spring during checkout.</>],
      ['Orders and checkout', <>Purchases are completed on {external(SITE.shopUrl, 'our Spring storefront')}. Spring provides payment processing, fulfillment, shipping, and order support under its applicable terms. This website does not itself accept card payments.</>],
      ['External links', <>Links to YouTube, social networks, and Spring are provided for convenience. Third-party sites control their own content, availability, and terms.</>],
      ['General disclaimer', <>Hunting and outdoor activities involve risk. Content on this site is for storytelling and general information, not a substitute for training, safety procedures, or applicable hunting rules. Nothing here limits any consumer rights that cannot legally be waived.</>],
      ['Questions', <>For website questions or rights requests, email {mail}. For order-specific help, see our <Link href="/shipping-returns">shipping and returns information</Link>.</>]
    ]
  },
  '/shipping-returns': {
    title: 'Shipping & returns',
    eyebrow: 'Merchandise support',
    description: 'What to expect when ordering official Chasing 606 merchandise.',
    intro: 'What to expect when ordering official Chasing 606 merchandise.',
    sections: [
      ['Who fulfills your order?', <>Our merchandise checkout is hosted by Spring. Product availability, shipping methods, fees, applicable taxes, and delivery estimates are presented at checkout. Your order confirmation is the best source for order-specific information.</>],
      ['Shipping timing', <>Many items are produced on demand, so making an item may take additional time before it ships. Delivery timing varies by product and destination. The estimate Spring shows during checkout and the tracking details in your order confirmation take precedence.</>],
      ['Returns, refunds, and exchanges', <>Eligibility depends on the item, order circumstances, Spring's policies, and applicable consumer law. Do not send merchandise back without return instructions. If an item arrives damaged, incorrect, or defective, use the support options in your Spring order confirmation as soon as possible.</>],
      ['Need order help?', <>For fulfillment, shipping, tracking, returns, or refunds, start with the order confirmation email and the support channel it provides. You can also email {mail} with the product name and order number, and we'll help direct your inquiry. Never email payment-card details.</>],
      ['Consumer rights', <>Nothing on this page removes cancellation, withdrawal, warranty, or refund rights that apply under the laws of your location or Spring's governing terms.</>]
    ]
  }
};
