import React from 'react';

const email = 'chasingbucks606@gmail.com';
const mail = <a href={`mailto:${email}`}>{email}</a>;
const shop = 'https://chasing-606-shop.fourthwall.com';

const pages = {
  '/privacy': {
    title:'Privacy policy', eyebrow:'YOUR PRIVACY MATTERS',
    intro:'How Chasing 606 handles information when you browse, contact us, or shop.',
    sections:[
      ['Who operates this website', <>Chasing 606 operates this website. For privacy questions, contact {mail}.</>],
      ['Information you choose to share', <>When you email Chasing 606, we receive the contact information and message you send. The main contact form opens a draft in your own email application. The separate developer contact form at /behind-the-build sends details you enter (such as your name, email address, project type, and message) to FormSubmit, an external form delivery provider, so Adam Adkins can receive and respond to inquiries. FormSubmit processes submissions under its own policies; do not submit sensitive information. If you purchase merchandise, Fourthwall handles checkout and order information on its own service.</>],
      ['Site operation and local storage', <>We use browser storage to remember your shopping-cart selections and whether the introductory animation has played. Our website hosting provider, Cloudflare, may process technical information such as IP address and request details to deliver the site and protect it from abuse. We do not collect payment card numbers through this website.</>],
      ['Other services', <>Product listings and hosted checkout are provided by Fourthwall. Our YouTube player loads third-party content when you choose to play a video. Links to YouTube and social sites take you to third-party services with their own privacy policies. See <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">FormSubmit's privacy statement</a>, <a href="https://fourthwall.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Fourthwall's privacy policy</a> and <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's privacy policy</a>.</>],
      ['How we use information', <>We use information we receive to respond to inquiries, operate and improve the website, and address merchandise questions. Fourthwall processes information needed for purchases under its own checkout and privacy terms.</>],
      ['Your choices and requests', <>You can clear your browser's local website data to remove saved cart selections. For questions about Chasing 606 messages, contact {mail}. For developer inquiries sent through the separate contact form, contact its recipient using the address provided on that page's email fallback. For order data, contact Fourthwall through the support options provided in your checkout or order confirmation. Applicable privacy rights may vary based on your location.</>],
      ['Children', <>Chasing 606 is intended for a general audience and does not knowingly solicit personal information from children under 13. If you believe a child has shared personal information with us, please contact {mail}.</>],
      ['Updates', <>We may update this policy when our website or service providers change. The date at the bottom indicates the latest revision.</>]
    ]
  },
  '/terms': {
    title:'Terms of use', eyebrow:'SITE INFORMATION',
    intro:'Terms for browsing Chasing 606 content and using links to our merchandise store.',
    sections:[
      ['Using this website', <>You may browse this website for personal, lawful use. Do not attempt to interfere with its operation, misuse its content, or gain unauthorized access.</>],
      ['Ownership of content', <>Unless otherwise identified, Chasing 606 branding, photography, artwork, and original content belong to their respective owners and may not be commercially reused without permission. YouTube videos and other third-party materials are subject to their owners' terms.</>],
      ['Product information', <>We try to keep product descriptions, photos, pricing, and availability accurate. Product details and stock may change. The final order details, applicable taxes, delivery charges, and payment terms are presented by Fourthwall during checkout.</>],
      ['Orders and checkout', <>Purchases are completed on <a href={shop} target="_blank" rel="noopener noreferrer">our Fourthwall storefront</a>. Fourthwall provides payment processing and, for eligible merchandise, fulfillment, shipping, and customer service under its applicable <a href="https://fourthwall.com/legal/terms-of-service" target="_blank" rel="noopener noreferrer">terms</a>. This website does not itself accept card payments.</>],
      ['External links', <>Links to YouTube, social networks, and Fourthwall are provided for convenience. Third-party sites control their own content, availability, and terms.</>],
      ['General disclaimer', <>Hunting and outdoor activities involve risk. Content on this site is for storytelling and general information, not a substitute for training, safety procedures, or applicable hunting rules. Nothing here limits any consumer rights that cannot legally be waived.</>],
      ['Questions', <>For website questions or rights requests, email {mail}. For order-specific help, see our <a href="/shipping-returns">shipping and returns information</a>.</>]
    ]
  },
  '/shipping-returns': {
    title:'Shipping & returns', eyebrow:'MERCHANDISE SUPPORT',
    intro:'What to expect when ordering official Chasing 606 merchandise.',
    sections:[
      ['Who fulfills your order?', <>Our merchandise checkout is hosted by Fourthwall. Product availability, shipping methods, fees, applicable taxes, and delivery estimates are presented at checkout. Your order confirmation is the best source for order-specific information.</>],
      ['Shipping timing', <>Many items are produced on demand, so making an item may take additional time before it ships. Delivery timing varies by product and destination. See <a href="https://help.fourthwall.com/frequently-asked-questions/shipping-and-orders/shipping-and-delivery-expectations" target="_blank" rel="noopener noreferrer">Fourthwall's shipping guidance</a> for general expectations; your checkout and tracking details take precedence.</>],
      ['Returns, refunds, and exchanges', <>Eligibility depends on the item, order circumstances, Fourthwall's policies, and applicable consumer law. Do not send merchandise back without return instructions. If an item arrives damaged, incorrect, or defective, use the support options in your Fourthwall order confirmation as soon as possible. See <a href="https://help.fourthwall.com/frequently-asked-questions/shipping-and-orders/returns-refunds-and-quality-issues" target="_blank" rel="noopener noreferrer">Fourthwall's returns and quality guidance</a>.</>],
      ['Need order help?', <>For fulfillment, shipping, tracking, returns, or refunds, start with the order confirmation email and the support channel it provides. You can also email {mail} with the product name and order number, and we'll help direct your inquiry. Never email payment-card details.</>],
      ['Consumer rights', <>Nothing on this page removes cancellation, withdrawal, warranty, or refund rights that apply under the laws of your location or Fourthwall's governing terms.</>]
    ]
  }
};
export const legalPaths = Object.keys(pages);
export default function LegalPage({ path }) {
  const page = pages[path];
  if (!page) return null;
  return <section className="legal-page page-shell">
    <div className="legal-page-inner">
      <div className="legal-page-heading">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}.</h1>
        <p>{page.intro}</p>
        <span className="legal-updated">Last updated: October 16, 2026</span>
      </div>
      <div className="legal-page-sections">
        {page.sections.map(([heading,body])=><section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
      </div>
      <aside className="legal-help">Questions? <a href={`mailto:${email}`}>Contact Chasing 606</a> or visit our <a href="/contact">contact page</a>.</aside>
    </div>
  </section>;
}
