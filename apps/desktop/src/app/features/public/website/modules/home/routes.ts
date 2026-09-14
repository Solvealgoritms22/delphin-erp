import { Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "",
    title: "Dolphine ERP",
    loadComponent: () => import("./features/home"),
  },
];

export default routes;
