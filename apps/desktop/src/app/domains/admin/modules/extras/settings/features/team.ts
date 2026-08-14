import { TitleCasePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput } from '@angular/material/input';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { TrashIcon } from 'ng-animated-icons';

@Component({
  selector: 'team-settings',
  imports: [
    FormsModule,
    MatFormField,
    MatIconButton,
    MatInput,
    MatButton,
    MatOption,
    MatSelect,
    MatSelectTrigger,
    TitleCasePipe,
    TranslocoPipe,
    TrashIcon,
  ],
  template: `
    <div class="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
      <div class="col-span-full flex items-center gap-x-3">
        <mat-form-field class="flex-auto">
          <input
            matInput
             [placeholder]="'extras.team.emailPlaceholder' | transloco"
          />
        </mat-form-field>
         <button matButton="outlined">{{ 'extras.team.invite' | transloco }}</button>
      </div>

      <!-- Divider -->
      <div class="col-span-full border-t border-neutral-200 dark:border-neutral-800"></div>

      <!-- Members -->
      @for (member of members; track member.name) {
        <div class="col-span-full flex flex-col sm:flex-row sm:items-center">
          <div class="flex flex-auto items-center">
            <div class="size-10 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
              @if (member.photo) {
                <img
                  [src]="member.photo"
                  alt="Member avatar"
                  class="w-full h-full object-cover"
                />
              } @else {
                {{ member.name.charAt(0) }}
              }
            </div>
            <div class="ml-4">
              <div class="font-medium tracking-tight">
                {{ member.name }}
              </div>
              <div class="text-sm text-neutral-500">
                {{ member.email }}
              </div>
            </div>
          </div>
          <div class="mt-4 flex items-center sm:mt-0">
            <div class="order-2 flex-auto sm:order-1 sm:ml-4 sm:w-48 sm:flex-none">
              <mat-form-field class="w-full">
                <mat-select [value]="member.role">
                  <mat-select-trigger>
                    {{ member.role | titlecase }}
                  </mat-select-trigger>
                  @for (role of roles; track role.value) {
                    <mat-option
                      class="h-auto py-4 leading-none"
                      [value]="role.value"
                    >
                      <div class="font-medium">
                        {{ role.label }}
                      </div>
                      <div
                        class="leading-normal mt-1.5 text-sm whitespace-normal text-neutral-500"
                      >
                        {{ role.description }}
                      </div>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="order-1 sm:order-2 sm:ml-3">
              <button mat-icon-button class="cursor-pointer">
                <i-trash [size]="18" class="text-neutral-500 hover:text-red-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export default class TeamSettings {
  // State
  protected roles = [
    {
      label: 'Read',
      value: 'read',
      description:
        'Can read and clone this repository. Can also open and comment on issues and pull requests.',
    },
    {
      label: 'Write',
      value: 'write',
      description:
        'Can read, clone, and push to this repository. Can also manage issues and pull requests.',
    },
    {
      label: 'Admin',
      value: 'admin',
      description:
        'Can read, clone, and push to this repository. Can also manage issues, pull requests, and repository settings, including adding collaborators.',
    },
  ];
  protected members = [
    {
      id: '1',
      photo: '/images/photos/male-01.jpg',
      name: 'Dejesus Michael',
      email: 'dejesusmichael@mail.org',
      role: 'admin',
    },
    {
      id: '2',
      photo: '/images/photos/male-03.jpg',
      name: 'Mclaughlin Steele',
      email: 'mclaughlinsteele@mail.me',
      role: 'admin',
    },
    {
      id: '3',
      photo: null,
      name: 'Laverne Dodson',
      email: 'lavernedodson@mail.ca',
      role: 'write',
    },
    {
      id: '4',
      photo: '/images/photos/female-03.jpg',
      name: 'Trudy Berg',
      email: 'trudyberg@mail.us',
      role: 'read',
    },
    {
      id: '5',
      photo: '/images/photos/male-07.jpg',
      name: 'Lamb Underwood',
      email: 'lambunderwood@mail.me',
      role: 'read',
    },
    {
      id: '6',
      photo: '/images/photos/male-08.jpg',
      name: 'Mcleod Wagner',
      email: 'mcleodwagner@mail.biz',
      role: 'read',
    },
    {
      id: '7',
      photo: '/images/photos/female-07.jpg',
      name: 'Shannon Kennedy',
      email: 'shannonkennedy@mail.ca',
      role: 'read',
    },
  ];
}
