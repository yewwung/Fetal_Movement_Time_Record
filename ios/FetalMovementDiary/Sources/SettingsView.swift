import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: DiaryStore
    @State private var showingClearConfirmation = false

    private var dueDateBinding: Binding<Date> {
        Binding(
            get: { store.settings.dueDate ?? Date() },
            set: { store.setDueDate($0) }
        )
    }

    var body: some View {
        ScreenContainer(title: "设置", note: "本机模式") {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 14) {
                    SectionHeading("Pregnancy", "孕期设置", note: "可选")
                    Picker("日期依据", selection: Binding(get: { store.settings.dueType }, set: store.setDueType)) {
                        ForEach(DueDateType.allCases) { type in
                            Text(type.title).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                    DatePicker(store.settings.dueType == .lmp ? "末次月经日期" : "预产期", selection: dueDateBinding, displayedComponents: .date)
                    if let info = store.pregnancyInfo {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text("当前孕周")
                                    .font(.caption)
                                    .foregroundStyle(Color.slate)
                                Text("\(info.weeks) 周 \(info.days) 天")
                                    .font(.title3.weight(.bold).monospacedDigit())
                                    .foregroundStyle(Color.ink)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 3) {
                                Text("预产期")
                                    .font(.caption)
                                    .foregroundStyle(Color.slate)
                                Text(info.dueDate.diaryMonthDay)
                                    .font(.title3.weight(.bold).monospacedDigit())
                                    .foregroundStyle(Color.coral)
                            }
                        }
                        .padding(.top, 4)
                    }
                    if store.settings.dueDate != nil {
                        Button("清除孕期日期", role: .destructive) {
                            store.setDueDate(nil)
                        }
                        .font(.caption.weight(.semibold))
                    }
                }
                .settingsSectionStyle()

                VStack(alignment: .leading, spacing: 14) {
                    SectionHeading("Display", "显示设置")
                    Picker("首页时钟", selection: Binding(get: { store.settings.clockMode }, set: store.setClockMode)) {
                        ForEach(ClockMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                .settingsSectionStyle()

                VStack(alignment: .leading, spacing: 14) {
                    SectionHeading("Storage", "数据与隐私")
                    HStack(spacing: 12) {
                        Image(systemName: "iphone.gen3")
                            .font(.title3)
                            .foregroundStyle(Color.sage)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("本机离线模式")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.ink)
                            Text("记录和设置只保存在这台 iPhone 的 App 沙盒中。")
                                .font(.caption)
                                .foregroundStyle(Color.slate)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    Divider()
                    Button(role: .destructive) {
                        showingClearConfirmation = true
                    } label: {
                        HStack {
                            Label("清空全部胎动记录", systemImage: "trash")
                            Spacer()
                            Text("\(store.records.count) 条")
                                .font(.caption.monospacedDigit())
                        }
                    }
                    .disabled(store.records.isEmpty)
                }
                .settingsSectionStyle()

                VStack(alignment: .leading, spacing: 8) {
                    Text("胎动记录")
                        .font(.headline)
                        .foregroundStyle(Color.ink)
                    Text("用于记录与回看，不替代医生的专业判断。更换设备或删除 App 前，建议先在时间线导出 CSV 备份。")
                        .font(.footnote)
                        .foregroundStyle(Color.slate)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 2)
            }
        }
        .confirmationDialog("清空全部记录？", isPresented: $showingClearConfirmation, titleVisibility: .visible) {
            Button("全部清空", role: .destructive) { store.clearAll() }
            Button("取消", role: .cancel) { }
        } message: {
            Text("此操作只会删除本机保存的数据，且无法恢复。")
        }
    }
}

private struct SettingsSectionModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private extension View {
    func settingsSectionStyle() -> some View {
        modifier(SettingsSectionModifier())
    }
}
