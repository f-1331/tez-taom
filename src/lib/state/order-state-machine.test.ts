import { describe, it, expect } from 'vitest';
import { validateOrderTransition } from './order-state-machine';

describe('order state machine', () => {
  it('allows valid sequential delivery transitions', () => {
    expect(validateOrderTransition('NEW', 'CONFIRMED').valid).toBe(true);
    expect(validateOrderTransition('CONFIRMED', 'PREPARING').valid).toBe(true);
    expect(validateOrderTransition('PREPARING', 'READY').valid).toBe(true);
    expect(validateOrderTransition('READY', 'ON_THE_WAY', 'DELIVERY').valid).toBe(true);
    expect(validateOrderTransition('ON_THE_WAY', 'DELIVERED').valid).toBe(true);
  });

  it('allows valid pickup transitions', () => {
    expect(validateOrderTransition('READY', 'PICKED_UP', 'PICKUP').valid).toBe(true);
  });

  it('blocks ON_THE_WAY for PICKUP orders', () => {
    const res = validateOrderTransition('READY', 'ON_THE_WAY', 'PICKUP');
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('blocks illegal jumps e.g. NEW -> DELIVERED', () => {
    const res = validateOrderTransition('NEW', 'DELIVERED');
    expect(res.valid).toBe(false);
  });

  it('requires a cancel reason when transitioning to CANCELED', () => {
    const withoutReason = validateOrderTransition('CONFIRMED', 'CANCELED');
    expect(withoutReason.valid).toBe(false);

    const withReason = validateOrderTransition('CONFIRMED', 'CANCELED', 'DELIVERY', 'Mijoz iltimosiga binoan');
    expect(withReason.valid).toBe(true);
  });

  it('blocks transitions from terminal states', () => {
    expect(validateOrderTransition('DELIVERED', 'CONFIRMED').valid).toBe(false);
    expect(validateOrderTransition('CANCELED', 'NEW').valid).toBe(false);
  });
});
