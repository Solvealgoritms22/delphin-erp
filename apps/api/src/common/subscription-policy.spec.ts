import { hasActiveSubscription } from './subscription-policy';
describe('Subscription rights', () => {
 const now = new Date('2026-09-12T00:00:00Z');
 it.each(['CANCELED','PAST_DUE','UNKNOWN'])('denies %s', estado => expect(hasActiveSubscription({estado,fechaRenovacion:new Date('2027-01-01')},now)).toBe(false));
 it.each(['ACTIVE','TRIAL'])('requires a future expiration for %s', estado => {
 expect(hasActiveSubscription({estado,fechaRenovacion:null},now)).toBe(false);
 expect(hasActiveSubscription({estado,fechaRenovacion:now},now)).toBe(false);
 expect(hasActiveSubscription({estado,fechaRenovacion:new Date('2027-01-01')},now)).toBe(true);
 });
});
