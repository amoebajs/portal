import { Request, Response } from "express";

export function AppIndexRedirect(req: Request, res: Response, next: Function) {
  if (req.path === "/" || req.path === "") {
    return res.redirect("/portal");
  } else {
    return next();
  }
}
