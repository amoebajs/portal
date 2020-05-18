import { createRouter } from "../../utils/route";

export const UseRouter = createRouter({
  index: { path: "", data: { title: "控制台" } },
  pages: { path: "manage/pages", data: { title: "页面管理" } },
  page: { path: "manage/page/:id", data: { title: "页面详情" } },
  create: { path: "preview/create/:id", data: { title: "创建页面" } },
  edit: { path: "preview/edit/:id", data: { title: "编辑页面" } },
  settings: { path: "settings", data: { title: "设置" } },
});
