# AMedia 介绍站

线上地址：https://aultbyel.github.io/AMedia/

用播放器里的莫奈背景和镜台（Diorama）歌词样式展示产品，并提供下载入口与详细信息。

## 本地预览

需要 Node.js 18 或更高版本。

```bash
npm install
npm start
```

然后打开 http://localhost:4173 。

页面是静态文件，位于 `public/`。`server.js` 只负责本地用 Node 提供这些文件。部署到 GitHub Pages 时，工作流会直接发布 `public/`，不运行 Node 服务。

## 更新下载链接

编辑 `public/data/product.json` 里的 `downloads` 和 `releasesPage`。填写安装包地址后，页面上的「即将发布」会自动变成可点击的下载按钮。
