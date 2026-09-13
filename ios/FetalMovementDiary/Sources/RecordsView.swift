import Foundation
import SwiftUI

struct RecordsView: View {
    @EnvironmentObject private var store: DiaryStore
    @State private var filter: RecordFilter = .week
    @State private var compactLayout = true
    @State private var expandedDays: Set<String> = []
    @State private var exportFrom = Date().addingDiaryDays(-30)
    @State private var exportTo = Date()
    @State private var exportURL: URL?
    @State private var editingRecord: MovementRecord?
    @State private var pendingDelete: MovementRecord?
    @State private var showingClearConfirmation = false

    private var groups: [DayGroup] { store.dayGroups(for: filter) }
    private var visibleRecords: [MovementRecord] { store.filteredRecords(filter) }

    var body: some View {
        ScreenContainer(title: "时间线", note: "共 \(store.records.count) 次") {
            VStack(alignment: .leading, spacing: 22) {
                exportSection

                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .firstTextBaseline) {
                        SectionHeading("Records", "胎动记录", note: "显示 \(visibleRecords.count) 次")
                        Spacer()
                        Button {
                            showingClearConfirmation = true
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(store.records.isEmpty ? Color.slate.opacity(0.35) : Color.coral)
                        }
                        .disabled(store.records.isEmpty)
                        .accessibilityLabel("清空记录")
                    }
                    Picker("记录范围", selection: $filter) {
                        ForEach(RecordFilter.allCases) { item in
                            Text(item.title).tag(item)
                        }
                    }
                    .pickerStyle(.segmented)

                    HStack {
                        Text(compactLayout ? "紧凑视图" : "列表视图")
                            .font(.caption)
                            .foregroundStyle(Color.slate)
                        Spacer()
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { compactLayout.toggle() }
                        } label: {
                            Label(compactLayout ? "切换为列表" : "切换为紧凑", systemImage: compactLayout ? "rectangle.grid.1x2" : "rectangle.grid.2x2")
                                .font(.caption.weight(.semibold))
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(Color.ink)
                    }
                }

                if groups.isEmpty {
                    EmptyRecordsView(hasHistory: !store.records.isEmpty) {
                        filter = .all
                    }
                } else {
                    VStack(spacing: compactLayout ? 8 : 14) {
                        ForEach(groups) { group in
                            dayGroup(group)
                        }
                    }
                }
            }
        }
        .sheet(item: $editingRecord) { record in
            RecordEditorView(record: record) { timestamp in
                store.update(record, timestamp: timestamp)
                editingRecord = nil
            } onCancel: {
                editingRecord = nil
            }
            .presentationDetents([.height(340)])
        }
        .alert("删除这条记录？", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })) {
            Button("删除", role: .destructive) {
                if let record = pendingDelete { store.delete(record) }
                pendingDelete = nil
            }
            Button("取消", role: .cancel) { pendingDelete = nil }
        } message: {
            Text("删除后无法恢复。")
        }
        .confirmationDialog("清空全部记录？", isPresented: $showingClearConfirmation, titleVisibility: .visible) {
            Button("全部清空", role: .destructive) { store.clearAll() }
            Button("取消", role: .cancel) { }
        } message: {
            Text("将永久删除当前设备上的 \(store.records.count) 条胎动记录。")
        }
        .onAppear {
            expandedDays.insert(Date().diaryDateKey)
        }
    }

    private var exportSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeading("Export", "导出 CSV", note: "本地生成")
            HStack(spacing: 12) {
                DatePicker("开始", selection: $exportFrom, displayedComponents: .date)
                    .labelsHidden()
                Image(systemName: "arrow.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.slate)
                DatePicker("结束", selection: $exportTo, in: exportFrom..., displayedComponents: .date)
                    .labelsHidden()
            }
            HStack {
                Text("范围内 \(exportedCount) 次记录")
                    .font(.caption)
                    .foregroundStyle(Color.slate)
                Spacer()
                Button {
                    do {
                        exportURL = try store.exportCSV(from: exportFrom, to: exportTo)
                    } catch {
                        exportURL = nil
                    }
                } label: {
                    Label("生成文件", systemImage: "arrow.down.doc")
                        .font(.subheadline.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.ink)
                if let exportURL {
                    ShareLink(item: exportURL, preview: SharePreview("胎动记录 CSV", image: Image(systemName: "doc.text"))) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.headline)
                    }
                    .accessibilityLabel("分享 CSV")
                }
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var exportedCount: Int {
        let start = exportFrom.diaryStartOfDay
        let end = Calendar.diary.date(byAdding: .day, value: 1, to: exportTo.diaryStartOfDay) ?? exportTo
        return store.records.filter { $0.timestamp >= start && $0.timestamp < end }.count
    }

    @ViewBuilder
    private func dayGroup(_ group: DayGroup) -> some View {
        let isToday = group.id == Date().diaryDateKey
        DisclosureGroup(isExpanded: Binding(get: { expandedDays.contains(group.id) }, set: { expanded in
            if expanded { expandedDays.insert(group.id) } else { expandedDays.remove(group.id) }
        })) {
            VStack(spacing: compactLayout ? 4 : 10) {
                ForEach(group.records) { record in
                    recordRow(record)
                }
            }
            .padding(.top, 8)
        } label: {
            HStack(spacing: 10) {
                Circle().fill(isToday ? Color.coral : Color.sage).frame(width: 9, height: 9)
                VStack(alignment: .leading, spacing: 3) {
                    if isToday {
                        Text("今天")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.coral)
                    }
                    Text(group.date.diaryFullDate)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.ink)
                }
                Spacer()
                Text("\(group.records.count) 次")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(Color.slate)
            }
        }
        .tint(Color.ink)
        .padding(14)
        .background(Color.white.opacity(0.66), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func recordRow(_ record: MovementRecord) -> some View {
        HStack(spacing: 12) {
            Capsule()
                .fill(Color.coral)
                .frame(width: 3, height: compactLayout ? 38 : 46)
            VStack(alignment: .leading, spacing: 3) {
                Text(record.timestamp.diaryTime)
                    .font(.body.weight(.semibold).monospacedDigit())
                    .foregroundStyle(Color.ink)
                if !compactLayout {
                    Text("胎动记录")
                        .font(.caption)
                        .foregroundStyle(Color.slate)
                }
            }
            Spacer()
            Button { editingRecord = record } label: {
                Image(systemName: "pencil")
            }
            .buttonStyle(.plain)
            .foregroundStyle(Color.slate)
            .accessibilityLabel("修改记录")
            Button(role: .destructive) { pendingDelete = record } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.plain)
            .foregroundStyle(Color.coral)
            .accessibilityLabel("删除记录")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, compactLayout ? 4 : 7)
    }
}

struct EmptyRecordsView: View {
    let hasHistory: Bool
    let showAll: () -> Void

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: hasHistory ? "line.3.horizontal.decrease.circle" : "clock.badge.plus")
                .font(.system(size: 32))
                .foregroundStyle(Color.sage)
            Text(hasHistory ? "这个范围没有记录" : "还没有胎动记录")
                .font(.headline)
                .foregroundStyle(Color.ink)
            Text(hasHistory ? "可以切换到全部查看历史数据。" : "回到首页，轻触按钮记录第一次胎动。")
                .font(.subheadline)
                .foregroundStyle(Color.slate)
            if hasHistory {
                Button("查看全部") { showAll() }
                    .buttonStyle(.bordered)
                    .tint(Color.ink)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

struct RecordEditorView: View {
    let record: MovementRecord
    let onSave: (Date) -> Void
    let onCancel: () -> Void
    @State private var timestamp: Date

    init(record: MovementRecord, onSave: @escaping (Date) -> Void, onCancel: @escaping () -> Void) {
        self.record = record
        self.onSave = onSave
        self.onCancel = onCancel
        _timestamp = State(initialValue: record.timestamp)
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("日期和时间", selection: $timestamp, in: ...Date(), displayedComponents: [.date, .hourAndMinute])
                Section {
                    Text("将记录调整为 \(timestamp.diaryFullDate) \(timestamp.diaryTimeWithoutSeconds)")
                        .font(.footnote)
                        .foregroundStyle(Color.slate)
                }
            }
            .navigationTitle("修改记录")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { onSave(timestamp) }
                }
            }
        }
    }
}
