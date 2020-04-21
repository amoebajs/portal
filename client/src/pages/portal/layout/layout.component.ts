import { Component, OnDestroy, OnInit } from "@angular/core";
import { PortalService } from "../services/portal.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";

@Component({
  selector: "app-portal-layout",
  templateUrl: "./layout.html",
})
export class PortalLayoutComponent implements OnInit, OnDestroy {
  private routeSubp!: Subscription;

  public get isCollapsed() {
    return this.portal.isCollapsed;
  }

  public set isCollapsed(value: boolean) {
    this.portal.isCollapsed = value;
  }

  public get menus() {
    return this.portal.menulist;
  }

  public get menuType() {
    return this.isCollapsed ? "menu-unfold" : "menu-fold";
  }

  public get userInfos() {
    return this.portal.userInfos;
  }

  constructor(route: ActivatedRoute, router: Router, private portal: PortalService) {
    this.routeSubp = route.url.subscribe(() => {
      this.portal.setCurrentUrl(router.url);
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.routeSubp && !this.routeSubp.closed) {
      this.routeSubp.unsubscribe();
    }
  }

  public onMenuClock() {
    this.portal.toggleMenuCollapsed();
  }
}
