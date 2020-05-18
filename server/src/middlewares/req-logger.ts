import moment from "moment";
import { Request, Response } from "express";

export function RequestLogger(req: Request, res: Response, next: Function) {
  console.log(`[${moment(new Date()).format("YYYY-MM-DD HH:mm:ss")}] ${req.path}`);
  return next();
}
