import { Component, ViewEncapsulation } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { filter, map, mergeMap } from "rxjs/operators";

@Component({
  selector: "app-entry",
  templateUrl: "./app.html",
  styleUrls: ["./index.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  constructor(title: Title, router: Router, route: ActivatedRoute) {
    router.events
      .pipe(
        filter(i => i instanceof NavigationEnd),
        map(() => searchTargetChild(route.root)),
        filter(r => r.outlet === "primary"),
        mergeMap(r => r.data),
      )
      .subscribe(data => {
        title.setTitle(getTitle(data.title));
      });
  }
}

function getTitle(title?: string): string {
  return title ? title + " - Editable Web System" : "Editable Web System";
}

function searchTargetChild(r: ActivatedRoute) {
  let child = r;
  let route = r;
  while (child) {
    if (child.firstChild) {
      child = child.firstChild;
      route = child;
    } else {
      child = null;
    }
  }
  return route;
}
