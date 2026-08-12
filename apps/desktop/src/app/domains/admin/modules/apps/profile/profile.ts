import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, NgIf],
  template: `
    <div class="flex flex-col flex-auto min-w-0 bg-neutral-50/50 dark:bg-transparent">
      
      <!-- Top Banner & Header -->
      <div class="relative w-full overflow-hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <!-- Background Pattern -->
        <div class="absolute inset-0 pointer-events-none opacity-40 dark:opacity-100 invert dark:invert-0" style="background-image: url('images/hex-bg.png'); background-size: cover; background-position: center;"></div>
        
        <div class="relative w-full px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          
          <!-- USER HEADER -->
          <div *ngIf="currentView === 'user'" class="flex flex-col items-center justify-center">
            <div class="relative">
              <img class="w-32 h-32 rounded-full border-4 border-white dark:border-neutral-900 shadow-sm object-cover" src="https://i.pravatar.cc/150?img=47" alt="Jenny Klabber">
              <div class="absolute inset-0 rounded-full border-[3px] border-emerald-500 pointer-events-none"></div>
            </div>
            <div class="mt-4 flex flex-col items-center">
              <div class="flex items-center gap-1.5">
                <h1 class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Jenny Klabber</h1>
                <mat-icon svgIcon="badge-check" class="text-blue-500 icon-size-5"></mat-icon>
              </div>
              <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-2 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                <div class="flex items-center gap-1.5"><mat-icon svgIcon="zap" class="icon-size-4"></mat-icon>KeenThemes</div>
                <div class="flex items-center gap-1.5"><mat-icon svgIcon="map-pin" class="icon-size-4"></mat-icon>SF, Bay Area</div>
                <div class="flex items-center gap-1.5"><mat-icon svgIcon="mail" class="icon-size-4"></mat-icon>jenny&#64;kteam.com</div>
              </div>
            </div>
          </div>

          <!-- COMPANY HEADER -->
          <div *ngIf="currentView === 'company'" class="flex flex-col items-center justify-center">
            <div class="relative">
              <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#58CC02] border-4 border-white dark:border-neutral-900 shadow-sm flex items-center justify-center overflow-hidden">
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 40 Q50 20 80 40 Q90 60 80 80 Q50 90 20 80 Q10 60 20 40 Z" fill="white"/>
                  <circle cx="35" cy="55" r="12" fill="black"/>
                  <circle cx="65" cy="55" r="12" fill="black"/>
                  <circle cx="35" cy="55" r="4" fill="white"/>
                  <circle cx="65" cy="55" r="4" fill="white"/>
                  <path d="M45 65 L50 75 L55 65 Z" fill="#FFC800"/>
                </svg>
              </div>
              <div class="absolute inset-0 rounded-3xl border-[3px] border-emerald-500 pointer-events-none"></div>
            </div>
            <div class="mt-4 flex flex-col items-center">
              <div class="flex items-center gap-1.5">
                <h1 class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Duolingo</h1>
                <mat-icon svgIcon="badge-check" class="text-blue-500 icon-size-5"></mat-icon>
              </div>
              <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-2 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                <div class="flex items-center gap-1.5"><mat-icon svgIcon="briefcase" class="icon-size-4"></mat-icon>Public Company</div>
                <div class="flex items-center gap-1.5"><mat-icon svgIcon="map-pin" class="icon-size-4"></mat-icon>Pittsburgh, KS</div>
                <div class="flex items-center gap-1.5"><mat-icon svgIcon="mail" class="icon-size-4"></mat-icon>info&#64;duolingo.com</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div class="flex items-center gap-8 overflow-x-auto hide-scrollbar">
            
            <button [matMenuTriggerFor]="profileMenu" class="pb-4 text-sm font-semibold text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500 flex items-center gap-1 whitespace-nowrap">
              Profiles <mat-icon svgIcon="chevron-down" class="icon-size-4"></mat-icon>
            </button>
            <mat-menu #profileMenu="matMenu">
              <button mat-menu-item (click)="currentView = 'user'">
                <mat-icon svgIcon="user" class="icon-size-4"></mat-icon> User Profile
              </button>
              <button mat-menu-item (click)="currentView = 'company'">
                <mat-icon svgIcon="briefcase" class="icon-size-4"></mat-icon> Company Profile
              </button>
            </mat-menu>
          </div>
          
          <!-- Actions -->
          <div class="flex items-center gap-2 pb-2 sm:pb-4 self-end sm:self-auto">
            <button class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors flex items-center gap-2">
              <mat-icon [svgIcon]="currentView === 'user' ? 'users' : 'user-plus'" class="icon-size-4 text-current"></mat-icon> 
              {{ currentView === 'user' ? 'Connect' : 'Follow' }}
            </button>
            <button class="border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 w-9 h-9 flex items-center justify-center rounded-lg transition-colors p-0">
              <mat-icon svgIcon="message-square" class="icon-size-4 text-current"></mat-icon>
            </button>
            <button class="border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 w-9 h-9 flex items-center justify-center rounded-lg transition-colors p-0">
              <svg class="icon-size-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="w-full px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- USER PROFILE -->
        <div *ngIf="currentView === 'user'" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- LEFT COLUMN -->
          <div class="flex flex-col gap-8">
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
              <h2 class="text-base font-bold text-neutral-900 dark:text-white mb-6">General Info</h2>
              <div class="flex flex-col gap-4 text-sm">
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Phone:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">+31 6 12345678</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Email:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">jenny&#64;studio.com</span></div>
                <div class="grid grid-cols-3 gap-4 items-center"><span class="text-neutral-500">Status:</span><div class="col-span-2 flex"><span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-md">Subscribed</span></div></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Type:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">Wholesale</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Encryption:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">Strong</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Last Order:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">Today at 13:06</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Signed Up:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">2 months ago</span></div>
              </div>
            </div>

            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col">
              <h2 class="text-base font-bold text-neutral-900 dark:text-white mb-6">Attributes</h2>
              <div class="flex flex-col gap-4 text-sm flex-auto">
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">customer_id:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">CUST567</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">c_name:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">jenny</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">license_id:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">LIC123</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">log_id:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">CUST567</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">resv_code:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">CS345</span></div>
                <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">orders_io:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">JENNYTIME</span></div>
              </div>
              <div class="mt-6 text-center border-t border-neutral-100 dark:border-neutral-800 pt-4"><a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-500">All Attributes</a></div>
            </div>

            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col">
              <h2 class="text-base font-bold text-neutral-900 dark:text-white mb-4">API Credentials</h2>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">The granted credentials serve a twofold function, enabling <a href="#" class="text-blue-600 dark:text-blue-500">API authentication</a> and governing JavaScript customization</p>
              <div class="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 mb-4">
                <input type="text" value="hwewe4654fdd5sdfh" class="bg-transparent border-none outline-none text-sm text-neutral-700 dark:text-neutral-300 w-full flex-auto" readonly>
                <button class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><mat-icon svgIcon="copy" class="icon-size-4"></mat-icon></button>
              </div>
              <button class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 self-start mb-6"><mat-icon svgIcon="key" class="icon-size-4 text-current"></mat-icon> Access Tokens</button>
              <div class="mt-auto text-center border-t border-neutral-100 dark:border-neutral-800 pt-4"><a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-500">Check API's</a></div>
            </div>

            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col">
              <h2 class="text-base font-bold text-neutral-900 dark:text-white mb-6">Skills</h2>
              <div class="flex flex-wrap gap-2">
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Web Design</span>
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Code Review</span>
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Figma</span>
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Product Development</span>
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Webflow</span>
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">AI</span>
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">noCode</span>
                <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Management</span>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="lg:col-span-2 flex flex-col gap-8">
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
              <div class="flex items-center justify-between p-6"><h2 class="text-base font-bold text-neutral-900 dark:text-white">Deals</h2><button class="text-neutral-400 hover:text-neutral-600"><mat-icon svgIcon="more-vertical" class="icon-size-5"></mat-icon></button></div>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                  <thead class="text-neutral-500 bg-neutral-50/50 dark:bg-neutral-800/20 border-y border-neutral-100 dark:border-neutral-800">
                    <tr><th class="px-6 py-4 font-medium">Deal Name</th><th class="px-6 py-4 font-medium">Amount</th><th class="px-6 py-4 font-medium">Status</th><th class="px-6 py-4 font-medium text-right">Duration</th><th class="px-4 py-4 w-10"></th></tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td class="px-6 py-4 font-medium text-neutral-900 dark:text-white">Acme Software License</td><td class="px-6 py-4 text-neutral-600 font-medium">$5,000</td><td class="px-6 py-4"><span class="bg-blue-100 text-blue-700 dark:bg-blue-500/10 text-xs font-semibold px-2 py-0.5 rounded-md">Ongoing</span></td><td class="px-6 py-4 text-right">30 days</td><td class="px-4 py-4"><button class="text-neutral-400 hover:text-neutral-600"><mat-icon svgIcon="more-vertical" class="icon-size-4"></mat-icon></button></td></tr>
                    <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td class="px-6 py-4 font-medium text-neutral-900 dark:text-white">Strategic Partnership Deal</td><td class="px-6 py-4 text-neutral-600 font-medium">$12,500</td><td class="px-6 py-4"><span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 text-xs font-semibold px-2 py-0.5 rounded-md">Closed</span></td><td class="px-6 py-4 text-right">45 days</td><td class="px-4 py-4"><button class="text-neutral-400 hover:text-neutral-600"><mat-icon svgIcon="more-vertical" class="icon-size-4"></mat-icon></button></td></tr>
                  </tbody>
                </table>
              </div>
              <div class="text-center border-t border-neutral-100 dark:border-neutral-800 py-4 mt-auto"><a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-700">All Deals</a></div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col">
              <div class="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                <h2 class="text-base font-bold text-neutral-900 dark:text-white">Recent Activity</h2>
                <div class="flex items-center gap-2 text-sm text-neutral-600">
                  <span class="font-medium">Auto refresh:</span><span class="font-medium">Off</span>
                  <div class="w-8 h-4 bg-neutral-200 dark:bg-neutral-700 rounded-full relative cursor-pointer ml-1">
                    <div class="absolute left-1 top-1 w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div class="p-6">
                <!-- Timeline container -->
                <div class="relative space-y-10 ml-0 sm:ml-4">
                  
                  <!-- Vertical Line -->
                  <div class="absolute left-[15px] top-4 bottom-[-16px] w-0.5 bg-neutral-200 dark:bg-neutral-800 z-0"></div>

                  <!-- Item 1 -->
                  <div class="relative pl-12">
                    <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 shadow-sm z-10"><mat-icon svgIcon="users" class="icon-size-4"></mat-icon></div>
                    <div class="flex flex-col gap-1">
                      <p class="text-sm text-neutral-900 dark:text-white">Jenny sent an <a href="#" class="text-blue-600 hover:underline">inquiry</a> about a <a href="#" class="text-blue-600 hover:underline">new product</a>.</p>
                      <span class="text-xs text-neutral-500 font-medium">Today, 9:00 AM</span>
                    </div>
                  </div>

                  <!-- Item 2 -->
                  <div class="relative pl-12">
                    <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 shadow-sm z-10"><mat-icon svgIcon="calendar" class="icon-size-4"></mat-icon></div>
                    <div class="flex flex-col gap-1">
                      <p class="text-sm text-neutral-900 dark:text-white">Jenny attended a webinar on new product features.</p>
                      <span class="text-xs text-neutral-500 font-medium mb-3">3 days ago, 11:45 AM</span>
                      <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-neutral-50/50 dark:bg-neutral-800/20">
                        <div class="flex justify-between items-start gap-4">
                          <div class="flex gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0"><mat-icon svgIcon="code" class="icon-size-5"></mat-icon></div>
                            <div class="flex flex-col gap-1"><h3 class="text-sm font-bold text-neutral-900 dark:text-white">Leadership Development Series: Part 1</h3><p class="text-xs text-neutral-500">The first installment of a leadership development series.</p></div>
                          </div>
                          <button class="text-blue-600 hover:text-blue-700 text-sm font-medium">View</button>
                        </div>
                        <div class="flex flex-wrap items-center gap-6 mt-5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          <div><span class="text-neutral-500">Code:</span> <a href="#" class="text-blue-600">#leaderdev-1</a></div>
                          <div class="flex items-center gap-2 flex-auto min-w-32">
                            <span class="text-neutral-500 shrink-0">Progress:</span>
                            <div class="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 w-full overflow-hidden"><div class="h-full bg-emerald-500 w-3/4"></div></div>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-neutral-500">Guests:</span>
                            <div class="flex -space-x-2">
                              <img class="w-6 h-6 rounded-full border border-white dark:border-neutral-900" src="https://i.pravatar.cc/150?img=1" alt="">
                              <img class="w-6 h-6 rounded-full border border-white dark:border-neutral-900" src="https://i.pravatar.cc/150?img=2" alt="">
                              <div class="w-6 h-6 rounded-full border border-white dark:border-neutral-900 bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold z-10">+24</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Item 3 -->
                  <div class="relative pl-12">
                    <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 shadow-sm z-10"><mat-icon svgIcon="log-in" class="icon-size-4"></mat-icon></div>
                    <div class="flex flex-col gap-1">
                      <p class="text-sm text-neutral-900 dark:text-white">Jenny's last login to the <a href="#" class="text-blue-600 hover:underline">Customer Portal</a></p>
                      <span class="text-xs text-neutral-500 font-medium">5 days ago, 4:07 PM</span>
                    </div>
                  </div>

                  <!-- Item 4 -->
                  <div class="relative pl-12">
                    <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 shadow-sm z-10"><mat-icon svgIcon="mail" class="icon-size-4"></mat-icon></div>
                    <div class="flex flex-col gap-1">
                      <p class="text-sm text-neutral-900 dark:text-white">Email campaign sent to Jenny for a special promotion.</p>
                      <span class="text-xs text-neutral-500 font-medium mb-3">1 week ago, 11:45 AM</span>
                      <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 bg-neutral-50/50 dark:bg-neutral-800/20 text-center flex flex-col items-center justify-center">
                        <h3 class="text-sm font-bold text-neutral-900 dark:text-white mb-2">First Campaign Created</h3>
                        <p class="text-xs text-neutral-500 flex items-center gap-1.5 justify-center"><a href="#" class="text-blue-600 hover:underline">Axio new release</a> email campaign<span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 text-[10px] font-semibold px-2 py-0.5 rounded-md">Public</span></p>
                      </div>
                    </div>
                  </div>

                  <!-- Item 5 -->
                  <div class="relative pl-12">
                    <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 shadow-sm z-10"><mat-icon svgIcon="rocket" class="icon-size-4"></mat-icon></div>
                    <div class="flex flex-col gap-1">
                      <p class="text-sm text-neutral-900 dark:text-white">Explored niche demo ideas for product-specific solutions.</p>
                      <span class="text-xs text-neutral-500 font-medium">3 weeks ago, 4:07 PM</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="text-center border-t border-neutral-100 dark:border-neutral-800 py-4 mt-auto bg-neutral-50/50 dark:bg-neutral-800/20 rounded-b-2xl"><a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-700">All-time Activities</a></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col">
                <div class="flex items-center justify-between p-6"><h2 class="text-base font-bold text-neutral-900 dark:text-white">Contributors</h2><button class="text-neutral-400 hover:text-neutral-600"><mat-icon svgIcon="more-vertical" class="icon-size-5"></mat-icon></button></div>
                <div class="px-6 flex flex-col gap-6 pb-6">
                  <div class="flex items-center justify-between"><div class="flex items-center gap-3"><img class="w-10 h-10 rounded-full" src="https://i.pravatar.cc/150?img=11" alt="User"><div class="flex flex-col"><span class="text-sm font-bold text-neutral-900 dark:text-white">Tyler Hero</span><span class="text-xs text-neutral-500 font-medium">6 contributors</span></div></div><button class="text-neutral-400 hover:text-neutral-600"><mat-icon svgIcon="more-vertical" class="icon-size-4"></mat-icon></button></div>
                </div>
                <div class="text-center border-t border-neutral-100 dark:border-neutral-800 py-4 mt-auto"><a href="#" class="text-sm font-medium text-blue-600">All Contributors</a></div>
              </div>
              
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col">
                <div class="flex items-center justify-between p-6"><h2 class="text-base font-bold text-neutral-900 dark:text-white">Recent Invoices</h2><button class="text-neutral-400 hover:text-neutral-600"><mat-icon svgIcon="more-vertical" class="icon-size-5"></mat-icon></button></div>
                <div class="px-6 flex flex-col gap-6 pb-6">
                  <div class="flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"><mat-icon svgIcon="file-text" class="icon-size-5"></mat-icon></div><div class="flex flex-col"><span class="text-sm font-bold text-neutral-900 dark:text-white">INV-2023-001</span><span class="text-xs text-neutral-500 font-medium">15 Nov, 2023</span></div></div><div class="flex items-center gap-3"><span class="text-sm font-medium text-neutral-900 dark:text-white">$500.00</span><button class="text-neutral-400 hover:text-neutral-600"><mat-icon svgIcon="more-vertical" class="icon-size-4"></mat-icon></button></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- COMPANY PROFILE -->
        <div *ngIf="currentView === 'company'" class="flex flex-col">
          
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 mb-8">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x-0 lg:divide-x lg:divide-neutral-100 lg:dark:divide-neutral-800">
              <div class="flex flex-col items-center justify-center"><span class="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">624</span><span class="text-sm text-neutral-500 font-medium mt-1">Employees</span></div>
              <div class="flex flex-col items-center justify-center"><span class="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">60.7M</span><span class="text-sm text-neutral-500 font-medium mt-1">Users</span></div>
              <div class="flex flex-col items-center justify-center"><span class="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">369M</span><span class="text-sm text-neutral-500 font-medium mt-1">Revenue</span></div>
              <div class="flex flex-col items-center justify-center"><span class="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">27</span><span class="text-sm text-neutral-500 font-medium mt-1">Company Rank</span></div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- LEFT COLUMN -->
            <div class="flex flex-col gap-8">
              <!-- Highlights -->
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
                <h2 class="text-base font-bold text-neutral-900 dark:text-white mb-6">Highlights</h2>
                <div class="flex flex-col gap-4 text-sm">
                  <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Locations:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">79</span></div>
                  <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Founded:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">2011</span></div>
                  <div class="grid grid-cols-3 gap-4 items-center"><span class="text-neutral-500">Status:</span><div class="col-span-2 flex"><span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 text-xs font-semibold px-2 py-0.5 rounded-md">Subscribed</span></div></div>
                  <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Area:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">Worldwide</span></div>
                  <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">CEO:</span><span class="col-span-2 text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Luis von Ahn</span></div>
                  <div class="grid grid-cols-3 gap-4"><span class="text-neutral-500">Sector:</span><span class="col-span-2 text-neutral-900 dark:text-white font-medium">Online Education</span></div>
                </div>
              </div>

              <!-- Open Jobs -->
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col">
                <h2 class="text-base font-bold text-neutral-900 dark:text-white p-6 pb-2">Open Jobs</h2>
                <div class="flex flex-col">
                  <div class="flex items-start gap-4 p-6 border-b border-neutral-100 dark:border-neutral-800 group cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div class="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0"><mat-icon svgIcon="bar-chart-2" class="icon-size-5"></mat-icon></div>
                    <div class="flex flex-col gap-0.5"><span class="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">Data Science</span><span class="text-xs text-neutral-500 font-medium">Data Science Ninja</span><span class="text-xs text-neutral-400 font-medium mt-0.5">$80,000 - $110,000</span></div>
                  </div>
                  <div class="flex items-start gap-4 p-6 border-b border-neutral-100 dark:border-neutral-800 group cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div class="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0"><mat-icon svgIcon="rocket" class="icon-size-5"></mat-icon></div>
                    <div class="flex flex-col gap-0.5"><span class="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">Exploration</span><span class="text-xs text-neutral-500 font-medium">Galactic Guide Writer</span><span class="text-xs text-neutral-400 font-medium mt-0.5">$45,000 - $60,000</span></div>
                  </div>
                </div>
                <div class="text-center py-4 mt-auto"><a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-700 border-b border-dashed border-blue-600 pb-0.5">View & Apply</a></div>
              </div>

              <!-- Network -->
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col">
                <h2 class="text-base font-bold text-neutral-900 dark:text-white mb-6">Network</h2>
                <div class="flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                  <div class="flex items-center gap-3"><mat-icon svgIcon="globe" class="icon-size-4"></mat-icon><a href="#" class="hover:text-neutral-900 dark:hover:text-white transition-colors">https://duolingo.com</a></div>
                  <div class="flex items-center gap-3"><mat-icon svgIcon="mail" class="icon-size-4"></mat-icon><a href="#" class="hover:text-neutral-900 dark:hover:text-white transition-colors">info&#64;duolingo.com</a></div>
                  <div class="flex items-center gap-3"><mat-icon svgIcon="facebook" class="icon-size-4"></mat-icon><a href="#" class="hover:text-neutral-900 dark:hover:text-white transition-colors">duolingo</a></div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN -->
            <div class="lg:col-span-2 flex flex-col gap-8">
              <!-- Company Profile Card -->
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 flex flex-col gap-8">
                <h2 class="text-base font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-4">Company Profile</h2>
                
                <!-- Headquarter -->
                <div class="flex flex-col gap-4">
                  <h3 class="text-sm font-bold text-neutral-900 dark:text-white">Headquarter</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div class="relative w-full h-40 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <img src="https://media.wired.com/photos/59269cd37034dc5f91bec0f1/master/w_2560%2Cc_limit/GoogleMapTA.jpg" alt="Map" class="w-full h-full object-cover opacity-70">
                      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-md"><div class="w-2 h-2 bg-white rounded-full"></div></div>
                      </div>
                    </div>
                    <div class="flex flex-col gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <div class="flex items-center gap-2"><mat-icon svgIcon="globe" class="icon-size-4"></mat-icon><a href="#" class="hover:text-neutral-900 dark:hover:text-white transition-colors">https://duolingo.com</a></div>
                      <div class="flex items-center gap-2"><mat-icon svgIcon="phone" class="icon-size-4"></mat-icon><a href="#" class="hover:text-neutral-900 dark:hover:text-white transition-colors">(31) 6-1235-4567</a></div>
                      <div class="flex items-start gap-2"><mat-icon svgIcon="map-pin" class="icon-size-4 shrink-0"></mat-icon><span>Herengracht 501, 1017 BV Amsterdam, NL</span></div>
                    </div>
                  </div>
                </div>

                <!-- About -->
                <div class="flex flex-col gap-3">
                  <h3 class="text-sm font-bold text-neutral-900 dark:text-white">About</h3>
                  <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">Now that I'm done thoroughly mangling that vague metaphor, let's get down to business. You know you need to start blogging to grow your business, but you don't know how.</p>
                </div>

                <!-- Products -->
                <div class="flex flex-col gap-4">
                  <h3 class="text-sm font-bold text-neutral-900 dark:text-white">Products</h3>
                  <div class="flex flex-wrap gap-2">
                    <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Lingo Kids</span>
                    <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Lingo Express</span>
                    <span class="px-3 py-1.5 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-medium rounded-lg">Fun Learning</span>
                  </div>
                </div>
              </div>

              <!-- Locations -->
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
                <div class="flex items-center justify-between p-6 pb-4">
                  <h2 class="text-base font-bold text-neutral-900 dark:text-white">Locations</h2>
                  <button class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                    <mat-icon svgIcon="map-pin" class="icon-size-4 text-current"></mat-icon> Offer Location
                  </button>
                </div>
                <div class="p-6 pt-2 pb-8 overflow-x-auto hide-scrollbar flex gap-6">
                  <div class="flex flex-col min-w-64 max-w-64">
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" class="w-full h-40 object-cover rounded-xl mb-4 shadow-sm" alt="Building">
                    <h3 class="text-sm font-bold text-neutral-900 dark:text-white mb-1">Duolingo Tech Hub</h3>
                    <p class="text-xs text-neutral-500 leading-relaxed">456 Innovation Street, Floor 6, Techland, New York</p>
                  </div>
                  <div class="flex flex-col min-w-64 max-w-64">
                    <img src="https://images.unsplash.com/photo-1545558014-8692077e9b5c?q=80&w=2070&auto=format&fit=crop" class="w-full h-40 object-cover rounded-xl mb-4 shadow-sm" alt="Building">
                    <h3 class="text-sm font-bold text-neutral-900 dark:text-white mb-1">Duolingo Language Lab</h3>
                    <p class="text-xs text-neutral-500 leading-relaxed">789 Learning Lane, 3rd Floor, Lingoville, Texas</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  `,
})
export class ProfileComponent {
  currentView: 'user' | 'company' = 'user';
}
