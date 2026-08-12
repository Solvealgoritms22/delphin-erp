import { animate, query, style, transition, trigger, stagger } from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        opacity: 0,
        transform: 'scale(0.96) translateY(8px)',
        transformOrigin: 'center top',
      }),
    ], { optional: true }),
    query(':leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        opacity: 1,
        transform: 'scale(1) translateY(0)',
        transformOrigin: 'center top',
      }),
      animate('180ms cubic-bezier(0.4, 0, 1, 1)', style({
        opacity: 0,
        transform: 'scale(1.025) translateY(-5px)',
        transformOrigin: 'center top',
      })),
    ], { optional: true }),
    query(':enter', [
      animate('280ms 35ms cubic-bezier(0, 0, 0.2, 1)', style({
        opacity: 1,
        transform: 'scale(1) translateY(0)',
        transformOrigin: 'center top',
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
