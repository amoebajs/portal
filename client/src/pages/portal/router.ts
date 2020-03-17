import { createRouter } from "../../utils/route";

export const UseRouter = createRouter({
  index: { path: "", data: { title: "控制台" } },
  pages: { path: "manage/pages", data: { title: "页面管理" } },
  create: { path: "preview/create", data: { title: "创建页面" } },
  edit: { path: "preview/edit/:version", data: { title: "编辑页面" } },
  settings: { path: "settings", data: { title: "设置" } },
});
