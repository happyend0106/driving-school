# driving-school-progress
科目三学员练习进度报告系统，基于 GitHub Pages 和 GitHub API，实现教练员登录、学员管理、CSV 导出和跨设备数据同步。

## 部署
- GitHub Pages: https://wd.20121020.xyz
- 数据存储: GitHub 仓库的 data.json（通过 GitHub API 读写）

## 配置
1. 生成 GitHub Personal Access Token（repo 权限）。
2. 在 github-api.js 中配置 GITHUB_TOKEN 和 REPO。
3. 部署到 GitHub Pages（main 分支，/root 目录）。