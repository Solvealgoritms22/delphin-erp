import { animate, query, style, transition, trigger, stagger } from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter', [
      style({
        opacity: 0,
        transform: 'scale(0.94) translateY(10px)',
        transformOrigin: 'center 20%',
      }),
      animate('280ms cubic-bezier(0.16, 1, 0.3, 1)', style({
        opacity: 1,
        transform: 'scale(1) translateY(0)',
      })),
    ], { optional: true }),
  ])
]);

export const staggerAnimations = trigger('staggerList', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(15px)' }),
      stagger('50ms', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);
