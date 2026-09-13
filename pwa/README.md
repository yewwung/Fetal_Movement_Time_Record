---
author: yewwung
authorEmail: yewwung@163.com
lastModifiedBy: yewwung
lastModified: 2026-09-13
---

# 胎动记录 PWA

这是给没有 Mac、但需要在 iPhone 上长期个人使用的版本。它是一个可添加到 iPhone 主屏幕的 PWA，不需要上架 App Store，也不需要 Apple Developer Program。

## 功能

- 实时数字时钟和表盘时钟
- 一键记录、修改、删除、清空胎动时间
- 今天 / 近 7 天 / 全部时间线
- 近 7 天统计和活跃时段图表
- 末次月经 / 预产期与孕周计算
- 日期范围 CSV 导出，通过 iPhone 系统分享或保存到“文件”
- `localStorage` 本地保存，Service Worker 离线缓存

## 添加到 iPhone

PWA 必须通过 HTTPS 地址打开，不能直接在 Safari 中打开本地 `file://` 文件。把整个 `pwa` 目录部署到任意静态 HTTPS 托管后：

1. 用 iPhone Safari 打开网页地址。
2. 点击底部“分享”按钮。
3. 选择“添加到主屏幕”。
4. 从主屏幕打开“胎动记录”，即可像 App 一样使用。

静态托管只负责提供网页代码，不保存胎动记录。本应用不会发起 API、云数据库或登录请求。Safari 的网站数据被清除后，本地记录可能丢失，建议定期导出 CSV。

## 本地测试

在 Windows 上可以直接启动一个静态服务器进行测试：

```powershell
cd pwa
npx --yes serve .
```

浏览器访问命令输出的地址即可。要测试“添加到主屏幕”和离线缓存，必须使用 HTTPS 地址或本机开发证书；普通 `http://localhost` 只适合功能预览。

## 与原生版本的关系

`ios/FetalMovementDiary` 是需要 Mac/Xcode 签名的原生 iPhone 工程；本目录的 PWA 是在没有 Mac 时推荐的安装方案。两者的数据各自保存在设备本地，不能自动互相读取。
