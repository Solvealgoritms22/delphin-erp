import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { ProductsService } from '../../data/products.service';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
     MatChipsModule, TranslocoPipe
  ],
  template: `
    <div class="flex h-full w-full flex-col flex-auto px-4 sm:px-6 md:px-8 py-8 overflow-y-auto overflow-x-hidden">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button mat-icon-button (click)="goBack()" class="text-neutral-500">
            <mat-icon svgIcon="arrow-left" class="icon-size-5"></mat-icon>
          </button>
          <h1 class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
             {{ (isEdit ? 'catalogs.products.edit' : 'catalogs.products.create') | transloco }}
          </h1>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col md:flex-row gap-6 w-full pb-24">
        
        <!-- Left Column -->
        <div class="flex flex-col flex-auto md:w-2/3 gap-6">
          
          <!-- Basic Information Card -->
          <div class="flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
             <h2 class="text-lg font-bold text-neutral-900 dark:text-white mb-6">{{ 'common.basicInformation' | transloco }}</h2>
            
            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'catalogs.products.name' | transloco }}</mat-label>
               <input matInput formControlName="nombre" [placeholder]="'catalogs.products.namePlaceholder' | transloco" />
            </mat-form-field>
            
            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'catalogs.products.code' | transloco }}</mat-label>
               <input matInput formControlName="codigo" [placeholder]="'catalogs.products.codePlaceholder' | transloco" />
            </mat-form-field>

            <mat-form-field class="w-full">
               <mat-label>{{ 'common.description' | transloco }}</mat-label>
              <!-- Simulating a rich text editor with a textarea for now -->
               <textarea matInput formControlName="descripcion" rows="6" [placeholder]="'catalogs.products.descriptionPlaceholder' | transloco"></textarea>
            </mat-form-field>
          </div>

          <!-- Pricing Card -->
          <div class="flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
             <h2 class="text-lg font-bold text-neutral-900 dark:text-white mb-6">{{ 'catalogs.products.pricing' | transloco }}</h2>
            
            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'common.price' | transloco }}</mat-label>
              <span matTextPrefix class="mr-2">$</span>
              <input matInput type="number" formControlName="precioVenta" placeholder="0.00" />
            </mat-form-field>

            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'catalogs.products.costPrice' | transloco }}</mat-label>
              <span matTextPrefix class="mr-2">$</span>
              <input matInput type="number" formControlName="costo" placeholder="0.00" />
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <mat-form-field class="w-full">
               <mat-label>{{ 'catalogs.products.bulkPrice' | transloco }}</mat-label>
                <span matTextPrefix class="mr-2">$</span>
                <input matInput type="number" placeholder="0.00" />
              </mat-form-field>

              <mat-form-field class="w-full">
               <mat-label>{{ 'catalogs.products.taxRate' | transloco }}</mat-label>
                <input matInput type="number" formControlName="taxRate" placeholder="0" />
              </mat-form-field>
            </div>
          </div>

        </div>

        <!-- Right Column -->
        <div class="flex flex-col w-full md:w-1/3 gap-6">
          
          <!-- Product Image Card -->
          <div class="flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
             <h2 class="text-lg font-bold text-neutral-900 dark:text-white mb-2">{{ 'catalogs.products.image' | transloco }}</h2>
             <p class="text-sm text-neutral-500 mb-6">{{ 'catalogs.products.imageDescription' | transloco }}</p>
            
            <!-- Hidden file input -->
            <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/png, image/jpeg, image/jpg" class="hidden" multiple />

            <!-- Drag and Drop Area -->
             <div
              (click)="fileInput.click()" 
              (dragover)="onDragOver($event)" 
              (dragleave)="onDragLeave($event)" 
              (drop)="onDrop($event)"
              [class.border-blue-500]="isDragging"
              [class.bg-blue-50]="isDragging"
               class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors relative overflow-hidden min-h-[190px]">
              
              <!-- Image Preview -->
               @if (imagePreviews.length > 0) {
                 <div class="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                   @for (image of imagePreviews; track $index) {
                     <div class="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                       <img [src]="image" alt="Product preview" class="h-full w-full object-contain p-1">
                       <button type="button" (click)="removeImage($event, $index)" [attr.aria-label]="'Remove image ' + ($index + 1)" class="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition group-hover:opacity-100 hover:bg-red-600">
                         <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
                       </button>
                     </div>
                   }
                 </div>
                 @if (imagePreviews.length < maxImages) {
                    <p class="mt-3 text-xs text-neutral-500"><span class="text-blue-600">{{ 'catalogs.products.addMore' | transloco }}</span> · {{ imagePreviews.length }}/{{ maxImages }}</p>
                 } @else {
                    <p class="mt-3 text-xs font-medium text-neutral-500">{{ 'catalogs.products.maxImages' | transloco: { count: maxImages } }}</p>
                 }
               } @else {
                 <mat-icon svgIcon="image" class="!h-16 !w-16 !text-[64px] text-neutral-400 mb-3"></mat-icon>
                 <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400 text-center">
                    {{ 'catalogs.products.dropImage' | transloco }} <span class="text-blue-600">{{ 'catalogs.products.browse' | transloco }}</span>
                 </p>
               }
             </div>
             @if (imageError) {
               <p class="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{{ imageError }}</p>
             }
             <p class="text-xs text-neutral-400 mt-4 text-center">
                {{ 'catalogs.products.imageHint' | transloco: { count: maxImages } }}
            </p>
          </div>

          <!-- Attribute Card -->
          <div class="flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
             <h2 class="text-lg font-bold text-neutral-900 dark:text-white mb-6">{{ 'catalogs.products.attributes' | transloco }}</h2>
            
            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'common.category' | transloco }}</mat-label>
              <mat-select formControlName="categoriaId">
                 <mat-option value="">{{ 'common.select' | transloco }}</mat-option>
                @for (cat of productsService.categories(); track cat.id) {
                  <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'common.tags' | transloco }}</mat-label>
               <input matInput formControlName="tags" [placeholder]="'catalogs.products.tagsPlaceholder' | transloco" />
            </mat-form-field>

            <mat-form-field class="w-full">
               <mat-label>{{ 'common.brand' | transloco }}</mat-label>
              <mat-select formControlName="marcaId">
                 <mat-option value="">{{ 'catalogs.products.brandPlaceholder' | transloco }}</mat-option>
                @for (marca of productsService.brands(); track marca.id) {
                  <mat-option [value]="marca.id">{{ marca.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

        </div>

      </form>

      <!-- Sticky Footer -->
      <div class="fixed bottom-0 left-0 sm:left-64 right-0 z-50 flex items-center justify-end px-8 py-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <button mat-button type="button" (click)="goBack()">
           {{ 'common.discard' | transloco }}
        </button>
        <button mat-flat-button [color]="'primary'" type="button" class="ml-4" (click)="submit()" [disabled]="form.invalid">
           {{ (isEdit ? 'common.save' : 'common.create') | transloco }}
        </button>
      </div>

    </div>
  `
})
export default class ProductFormComponent implements OnInit {
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  productsService = inject(ProductsService);

  isEdit = false;
  productId: string | null = null;
  form!: FormGroup;

  isDragging = false;
  imagePreviews: string[] = [];
  imageError = '';
  readonly maxImages = 5;

  ngOnInit() {
    this.productsService.loadCatalogs();
    
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.productId && this.productId !== 'new';
    
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      codigo: ['', Validators.required],
      descripcion: [''],
      precioVenta: [0, [Validators.required, Validators.min(0)]],
      costo: [0, [Validators.min(0)]],
      taxRate: [0],
      categoriaId: [null],
      marcaId: [null],
      tags: [''],
      imagenes: [null]
    });

    if (this.isEdit) {
      // In a real scenario we would fetch the product details here
      // this.productsService.findOne(this.productId).subscribe(data => this.form.patchValue(data));
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.handleFiles(Array.from(input.files || []));
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    this.handleFiles(Array.from(event.dataTransfer?.files || []));
  }

  handleFiles(files: File[]) {
    this.imageError = '';
    const availableSlots = this.maxImages - this.imagePreviews.length;
    if (availableSlots <= 0) {
      this.imageError = `Solo puedes cargar hasta ${this.maxImages} imágenes.`;
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      this.imageError = `Solo se agregaron ${availableSlots} imágenes. El máximo es ${this.maxImages}.`;
    }

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        this.imageError = 'Solo puedes cargar archivos de imagen.';
        continue;
      }
      if (file.size > 500 * 1024) {
        this.imageError = 'Cada imagen debe pesar como máximo 500 KB.';
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviews = [...this.imagePreviews, reader.result as string].slice(0, this.maxImages);
        this.form.patchValue({ imagenes: JSON.stringify(this.imagePreviews) });
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(event: Event, index: number) {
    event.stopPropagation();
    this.imagePreviews = this.imagePreviews.filter((_, imageIndex) => imageIndex !== index);
    this.form.patchValue({ imagenes: this.imagePreviews.length ? JSON.stringify(this.imagePreviews) : null });
  }

  goBack() {
    this.router.navigate(['/admin/catalogs/products']);
  }

  submit() {
    if (this.form.invalid) return;

    if (this.isEdit) {
      // update logic
      // this.productsService.update(this.productId, this.form.value).subscribe(() => this.goBack());
    } else {
      this.productsService.create(this.form.value).subscribe(() => this.goBack());
    }
  }
}
