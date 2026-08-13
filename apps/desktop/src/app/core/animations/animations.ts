import { animate, query, style, transition, trigger, stagger } from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
      }),
    ], { optional: true }),
    query(':enter', [
      style({
        opacity: 0,
        transform: 'scale(0.96) translateY(6px)',
        transformOrigin: 'center top',
      }),
    ], { optional: true }),
    query(':leave', [
      style({
        opacity: 1,
        transform: 'scale(1) translateY(0)',
        transformOrigin: 'center top',
      }),
      animate('160ms cubic-bezier(0.4, 0, 1, 1)', style({
        opacity: 0,
        transform: 'scale(1.02) translateY(-4px)',
        transformOrigin: 'center top',
      })),
    ], { optional: true }),
    query(':enter', [
      animate('260ms 30ms cubic-bezier(0, 0, 0.2, 1)', style({
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
