---
author: yewwung
authorEmail: yewwung@163.com
lastModifiedBy: yewwung
lastModified: 2026-09-13
---

# 胎动记录

## iPhone 个人版（无 Mac 推荐）

可安装到 iPhone 主屏幕的版本位于 [`pwa`](./pwa)。它不需要 Mac、Xcode、App Store、Apple 开发者账号、服务器或数据库；胎动记录和孕期设置只保存在 iPhone 本机 Safari 中。

使用前，需要先把 `pwa` 目录部署到一个 HTTPS 静态网址。详细的部署要求、安装步骤和数据注意事项见 [`pwa/README.md`](./pwa/README.md)。

当前保留两个互相独立的静态发布地址：

- Netlify 主地址：`https://teal-llama-ebde38.netlify.app`
- GitHub Pages 备用地址：`https://yewwung.github.io/Fetal_Movement_Time_Record/`

两个地址运行相同的 PWA，但浏览器本地数据按网址分别保存，记录不会在两个地址之间自动同步。正式使用时建议固定选择其中一个地址，并定期导出 CSV。

## 微信小程序版

当前正式交付为微信小程序版本，源码位于 [`miniprogram`](./miniprogram)。不需要服务器或数据库，胎动记录和孕期设置全部保存在手机微信本机。

## 在微信开发者工具中打开

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本仓库的 `miniprogram` 文件夹。
4. 当前已配置微信小程序测试号 AppID，可直接编译和预览；正式上线前仍需替换为已注册小程序的正式 AppID。
5. 点击“预览”，用 iPhone 微信扫码即可使用。

本机已安装微信开发者工具，也可以执行：

```powershell
& "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" open --project "D:\yewwung\BaiduSyncdisk\yew工作\Fetal_Movement_Time_Record\miniprogram"
```

## 已实现功能

- 打开小程序就是当前时钟
- 数字时钟和模拟表盘切换
- 一键记录胎动时间
- 时间线查看、单条修改（日期和时间）、单条删除
- 清空全部记录并二次确认
- 近 7 天次数统计与全天活跃时段图表
- 选择日期范围生成并分享 CSV
- 设置末次月经或预产期，自动计算孕周
- 本机离线模式，无需登录、服务器或数据库
- `wx.setStorageSync` 本地持久化

## iOS 原生版本

已在 [`ios/FetalMovementDiary`](./ios/FetalMovementDiary) 下复制并迁移为 SwiftUI 工程源码。iOS 版不依赖云服务或数据库，使用 `Codable + UserDefaults` 保存本机记录，支持首页、时间线、统计、孕期设置和 CSV 系统分享。

当前工作区是 Windows，不能运行 Xcode、签名或生成 `.ipa`。请在 macOS 上安装 XcodeGen 后执行：

```bash
cd ios/FetalMovementDiary
xcodegen generate
open FetalMovementDiary.xcodeproj
```

然后在 Xcode 中选择 Apple Team 和唯一的 Bundle Identifier，连接 iPhone 后点击 Run。免费 Apple ID 适合个人调试，长期安装、TestFlight 或 App Store 发布需要 Apple Developer Program。详细安装、签名和数据存储说明见 [`ios/FetalMovementDiary/README.md`](./ios/FetalMovementDiary/README.md)。

## 修改一条记录

1. 点击底部“时间线”。默认显示近 7 天，可切换“今天”或“全部”；记录较多时默认使用“紧凑”两列视图，也可以切换回“列表”。
2. 找到要调整的日期，点击日期标题即可展开或收起该组记录，再点击记录右侧“修改”。首页“最近记录”中的时间也可以直接点击。
3. 在“修改记录”面板分别选择日期和时间，点击“保存修改”。
4. 保存后首页、时间线和统计会立即刷新；不能保存晚于当前时刻的时间。

## CSV 导出

小程序会将 CSV 写入微信本机沙箱，再调用微信文件分享面板。在 iPhone 上可以存入“文件”、发送给文件传输助手或分享给其他应用。开发者工具模拟器不一定支持文件分享，请使用真机预览验证。

## 发布说明

微信小程序不经过 Apple App Store，也不需要购买服务器。正式给其他人使用时，需要一个微信小程序 AppID，并在微信公众平台提交审核发布；本地预览和测试号体验不需要后端服务。

## 本机离线模式

首版采用纯本机模式，手机号认证入口已隐藏，`cloudEnvId` 保持为空。胎动记录和孕期设置只保存在当前手机微信中，不需要购买服务器或数据库。更换手机、删除小程序或清理微信数据可能丢失记录，建议定期导出 CSV 备份。

胎动日记仅用于记录与回看，不替代医生的专业判断。
