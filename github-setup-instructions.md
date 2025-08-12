# GitHub 部署指南

## 步骤1: 在GitHub上创建新仓库

1. 打开浏览器，访问 https://github.com
2. 登录您的GitHub账号
3. 点击右上角的 "+" 号，选择 "New repository"
4. 填写仓库信息：
   - Repository name: `qr-code-hider`
   - Description: `智能二维码隐藏工具 - 将二维码巧妙隐藏在背景图中，避免平台检测`
   - 选择 "Public" (如果希望其他人能访问)
   - **不要**勾选 "Initialize this repository with a README"
   - **不要**添加 .gitignore 或 license (我们已经有了)
5. 点击 "Create repository"

## 步骤2: 连接本地仓库到GitHub

创建仓库后，GitHub会显示快速设置页面。复制仓库的HTTPS URL (类似: https://github.com/您的用户名/qr-code-hider.git)

然后在PowerShell中运行以下命令 (请替换YOUR_USERNAME为您的GitHub用户名):

```bash
git remote add origin https://github.com/YOUR_USERNAME/qr-code-hider.git
git branch -M main
git push -u origin main
```

## 步骤3: 自动部署 (GitHub Actions)

我们已经创建了GitHub Actions工作流文件，会自动部署您的网站：

1. 推送代码后，GitHub Actions会自动触发
2. 访问仓库的 "Actions" 选项卡查看部署状态
3. 等待工作流完成（通常需要1-2分钟）
4. 部署完成后，网站将自动可用

几分钟后，您的网站将在以下地址可用:
`https://mizukisheena.github.io/qr-code-hider/login.html`

### 备用方法: 手动启用GitHub Pages

如果自动部署有问题，可以手动设置：

1. 在GitHub仓库页面，点击 "Settings" 选项卡
2. 在左侧菜单中找到 "Pages"
3. 在 "Source" 部分选择 "GitHub Actions"
4. 选择工作流: "Deploy static content to Pages"

## 访问说明

- 网站入口: `https://YOUR_USERNAME.github.io/qr-code-hider/login.html`
- 访问密码: `codehider2025`
- 会话有效期: 24小时

## 安全特性

✅ 密码保护访问
✅ 会话管理 (24小时有效期)
✅ 尝试次数限制 (最多5次)
✅ 本地存储验证
✅ 所有图片处理都在客户端完成，无服务器上传

## 后续维护

如需修改密码，请编辑 `login.html` 文件中的:
```javascript
this.correctPassword = 'codehider2025';
```

然后提交更改:
```bash
git add .
git commit -m "Update password"
git push origin main
```
