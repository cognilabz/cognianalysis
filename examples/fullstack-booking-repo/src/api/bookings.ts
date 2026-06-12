export async function createBooking(input: { guestName: string; slotId: string }) {
  if (!input.guestName || !input.slotId) throw new Error('missing booking fields');
  return { bookingId: 'bk_' + input.slotId, status: 'CONFIRMED' };
}
