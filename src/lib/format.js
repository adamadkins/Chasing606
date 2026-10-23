const formatters = new Map();

export function formatMoney(amount, currency = 'USD') {
  if (!formatters.has(currency)) formatters.set(currency, new Intl.NumberFormat('en-US', { style: 'currency', currency }));
  return formatters.get(currency).format(amount);
}
