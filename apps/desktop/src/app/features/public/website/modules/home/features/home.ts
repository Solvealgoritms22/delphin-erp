import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslocoDirective, TranslocoService } from "@jsverse/transloco";

@Component({
  selector: "website-home",
  host: { "(click)": "onSectionLink($event)" },
  imports: [RouterLink, TranslocoDirective],
  templateUrl: "./home.html",
  styleUrl: "./home.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class WebsiteHome {
  readonly i18n = inject(TranslocoService);
  readonly menuOpen = signal(false);
  readonly activeModule = signal(0);
  readonly modules = ["sales", "inventory", "intelligence"];
  readonly faqItems = ["q1", "q2", "q3", "q4", "q5"] as const;
  readonly installer =
    "https://github.com/Solvealgoritms22/delphin-erp/releases/download/v1.0.17/Dolphin-ERP-Setup-1.0.17.exe";
  constructor() {
    if (
      typeof localStorage !== "undefined" &&
      !localStorage.getItem("dolphin_language")
    ) {
      this.i18n.setActiveLang("es");
    }
  }
  selectWithKeyboard(event: KeyboardEvent, index: number): void {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 2
          : (index + (event.key === "ArrowDown" ? 1 : 2)) % 3;
    this.activeModule.set(next);
    const list = (event.currentTarget as HTMLElement).parentElement;
    list?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  onSectionLink(event: MouseEvent): void {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href^="#"]',
    );
    if (!anchor) return;
    const section = anchor
      .closest("website-home")
      ?.querySelector<HTMLElement>(anchor.getAttribute("href")!);
    if (!section) return;
    event.preventDefault();
    this.menuOpen.set(false);
    section.scrollIntoView({ block: "start" });
    if (section.id === "main") section.focus({ preventScroll: true });
  }
  toggleLanguage(): void {
    const language = this.i18n.getActiveLang() === "es" ? "en" : "es";
    this.i18n.setActiveLang(language);
    if (typeof localStorage !== "undefined")
      localStorage.setItem("dolphin_language", language);
  }
}
