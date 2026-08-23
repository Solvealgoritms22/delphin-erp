import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { BrandsController } from './brands/brands.controller';
import { BrandsService } from './brands/brands.service';
import { UnitsController } from './units/units.controller';
import { UnitsService } from './units/units.service';

@Module({
  controllers: [
    ProductsController,
    CategoriesController,
    BrandsController,
    UnitsController,
  ],
  providers: [ProductsService, CategoriesService, BrandsService, UnitsService],
})
export class CatalogsModule {}
