import { enableProdMode } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";
import { BaseComponent } from "./app/base.component";
import { environment } from "./environments/environment";

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(BaseComponent, appConfig).catch((err: unknown) => {
  console.error(err);
});
