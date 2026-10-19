import React from 'react';
import Icon from './Icon';
import { SHOP_URL } from './shop';
export default function Account(){
 return <section className="account-page page-shell"><div className="page-heading"><p className="eyebrow">YOUR CHASING 606 SHOP</p><h1>Your gear. Your next hunt.</h1><p>Our merchandise and orders are hosted securely by Spring.</p></div><div className="account-card"><Icon name="bag"/><h2>Head to the shop.</h2><p>Continue to Spring to view your cart and use the order options available there. For an existing order, use the link in your confirmation email.</p><a className="button story-watch" href={SHOP_URL}>CONTINUE TO SPRING <Icon/></a><div className="account-links"><a href="/contact">Need a hand with an order?</a></div></div></section>;
}
