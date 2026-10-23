// Shop categories, shared by every catalog source so filters look the same.
export function categoryFor(...descriptions) {
  const text = descriptions.filter(Boolean).join(' ');
  if (/\b(hats?|caps?|beanies?|snapbacks?|truckers?|visors?)\b/i.test(text)) return 'Hats';
  if (/hoodie|sweatshirt|pullover|crewneck/i.test(text)) return 'Hoodies & Sweatshirts';
  if (/tee|shirt|tank/i.test(text)) return 'T-Shirts';
  if (/tumbler|mug|bottle|drink/i.test(text)) return 'Drinkware';
  if (/sticker/i.test(text)) return 'Stickers';
  if (/tapestry|poster|blanket|pillow/i.test(text)) return 'Home & Wall';
  return 'Accessories';
}
