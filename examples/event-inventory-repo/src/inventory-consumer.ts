export function handleInventoryReservation(event: { type: string; sku: string; quantity: number }) {
  if (event.type === 'inventory.reservation.requested') {
    return { type: 'inventory.reservation.confirmed', sku: event.sku, quantity: event.quantity };
  }
  return { type: 'inventory.reservation.ignored', sku: event.sku };
}
