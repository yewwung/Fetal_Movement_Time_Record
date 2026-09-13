---
author: yewwung
authorEmail: yewwung@163.com
lastModifiedBy: yewwung
lastModified: 2026-09-12
---

# 胎动记录 iOS 版

这是当前微信小程序的原生 iOS 迁移版，使用 SwiftUI 编写，目标是 iOS 16 及以上。界面和功能沿用小程序的核心流程，但改成了 iOS 原生交互：`TabView` 底部导航、`DatePicker` 日期时间选择、记录行编辑按钮和系统 `ShareLink` 文件分享。

## 已实现

- 首页实时数字时钟和表盘时钟
- 一键记录胎动，支持轻触反馈
- 今日波形、最近记录和累计次数
- 时间线按日期分组，支持今天 / 近 7 天 / 全部筛选
- 紧凑视图 / 列表视图切换
- 修改记录日期和时间、单条删除、清空全部记录
- 近 7 天和时段统计
- 末次月经或预产期设置，自动计算孕周
- 按日期范围生成 CSV，并使用 iOS 系统分享面板导出
- 完全离线，本机保存，不需要登录、服务器、云服务或数据库

## 数据存储

记录和设置会编码为 JSON `Data`，保存在 iOS App 沙盒的 `UserDefaults` 中：

- `fetal-diary-records-v1`
- `fetal-diary-settings-v1`

这与小程序的本地优先原则一致，但微信本地存储无法被 iOS App 直接读取。跨设备或卸载 App 前，请在“时间线”导出 CSV 备份。

## 安装到 iPhone

当前工作区是 Windows，无法在这里运行 Xcode、签名或生成 `.ipa`。把本目录复制到 macOS，安装 Xcode 15 或更高版本后执行：

```bash
brew install xcodegen
cd ios/FetalMovementDiary
xcodegen generate
open FetalMovementDiary.xcodeproj
```

在 Xcode 中完成以下步骤即可装到自己的 iPhone：

1. 在 `Signing & Capabilities` 中登录 Apple ID，选择自己的 Team；把 Bundle Identifier 改成未被占用的值。
2. 用数据线连接 iPhone，在设备的“设置 > 隐私与安全性”中打开“开发者模式”。
3. 在 Xcode 顶部运行设备中选择这台 iPhone，点击 Run。首次运行时，在 iPhone 的“VPN 与设备管理”中信任自己的开发者证书。

免费 Apple ID 可以用于个人真机调试，但安装签名通常 7 天后需要重新运行；长期给其他人安装、TestFlight 或上架 App Store，需要 Apple Developer Program。`project.yml` 和 `Sources/Info.plist` 已配置 iPhone-only、竖屏、版本号、健康健身分类以及不使用非豁免加密，不会生成任何云服务或网络权限。

发布归档时，在 Xcode 选择 `Product > Archive`，再通过 Organizer 上传 TestFlight 或导出 Ad Hoc `.ipa`。这一步必须在 macOS 上完成，并由 Apple 账号签名。

生成工程后也可以运行本地单元测试：

```bash
xcodebuild test -scheme FetalMovementDiary -destination 'platform=iOS Simulator,name=iPhone 16'
```

## 与参考项目的关系

`Per_Todo` 使用 Vue 3 + TypeScript + Vite + Tauri 2 + Rust/SQLite，并把存储和业务逻辑分层。iOS 版保留了这个分层思路，但采用 iOS 原生方案：SwiftUI 负责视图，`DiaryStore` 负责状态与业务逻辑，`Codable + UserDefaults` 负责本地持久化。对于目前的数据规模，不引入 SQLite 可以减少依赖和维护成本。
