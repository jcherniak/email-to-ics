import SwiftUI
import WebToICSCore

struct InboxView: View {
    @Bindable var model: JobsModel
    @State private var delivery = DeliveryCoordinator()

    var body: some View {
        NavigationStack {
            Group {
                if model.jobs.isEmpty {
                    EmptyInboxView(hasKey: AppEnvironment.shared.secrets.has(.openRouterAPIKey)) { model.showSettings = true }
                } else {
                    jobList
                }
            }
            .navigationTitle("Web to ICS")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Settings", systemImage: "gearshape") { model.showSettings = true }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Refresh", systemImage: "arrow.clockwise") { model.rescan() }
                        if model.hasFinished {
                            Button("Clear finished", systemImage: "trash", role: .destructive) { model.clearFinished() }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .navigationDestination(for: ShareJob.ID.self) { id in
                if let job = model.jobs.first(where: { $0.id == id }) {
                    JobDetailView(job: job, events: model.events(for: job))
                } else {
                    Text("This job is gone.").foregroundStyle(.secondary)
                }
            }
            .safeAreaInset(edge: .bottom) {
                if model.selectedCount > 0 {
                    AddEventsBar(count: model.selectedCount, isRunning: delivery.isRunning) {
                        let groups = model.selectedByJob
                        Task { await delivery.deliver(groups) }
                    }
                }
            }
        }
        .sheet(isPresented: $model.showSettings, onDismiss: { model.reload() }) {
            SettingsView()
        }
        .sheet(item: $delivery.activeEventEdit, onDismiss: { delivery.editSheetDismissed() }) { request in
            EventEditSheet(request: request)
                .ignoresSafeArea()
                .interactiveDismissDisabled()
        }
        .sheet(item: $delivery.activeShare, onDismiss: { delivery.shareSheetDismissed() }) { request in
            ActivityShareSheet(request: request)
                .presentationDetents([.medium, .large])
        }
        .alert("Calendar", isPresented: Binding(get: { delivery.report != nil }, set: { if !$0 { delivery.report = nil } })) {
            Button("OK") { delivery.report = nil }
        } message: {
            if let report = delivery.report {
                Text(([report.summary] + report.failures.prefix(3)).joined(separator: "\n"))
            }
        }
        .onAppear { model.reload() }
    }

    private var jobList: some View {
        List {
            if model.snapshot.inProgress > 0 {
                Section {
                    BatchProgressHeader(snapshot: model.snapshot)
                }
            }
            if !model.ready.isEmpty {
                Section("Ready to add") {
                    ForEach(model.ready) { job in
                        ReadyJobSection(job: job, model: model)
                    }
                }
            }
            if !model.inProgress.isEmpty {
                Section("In progress") {
                    ForEach(model.inProgress) { job in
                        NavigationLink(value: job.id) { JobRowView(job: job) }
                    }
                }
            }
            if !model.failed.isEmpty {
                Section("Failed") {
                    ForEach(model.failed) { job in
                        NavigationLink(value: job.id) { JobRowView(job: job) }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) { model.delete(job) } label: { Label("Delete", systemImage: "trash") }
                            }
                            .swipeActions(edge: .leading) {
                                Button { model.retry(job) } label: { Label("Retry", systemImage: "arrow.clockwise") }.tint(.blue)
                            }
                    }
                }
            }
            if !model.added.isEmpty {
                Section("Added") {
                    ForEach(model.added) { job in
                        NavigationLink(value: job.id) { JobRowView(job: job) }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { model.rescan() }
    }
}

struct AddEventsBar: View {
    let count: Int
    let isRunning: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if isRunning { ProgressView().tint(.white) }
                Text(isRunning ? "Adding…" : "Add \(count) event\(count == 1 ? "" : "s")")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
        }
        .buttonStyle(.borderedProminent)
        .disabled(isRunning)
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(.bar)
    }
}

struct BatchProgressHeader: View {
    let snapshot: BatchSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(snapshot.headline).font(.headline)
                Spacer()
                if snapshot.failed > 0 {
                    Text("\(snapshot.failed) failed").font(.caption).foregroundStyle(.red)
                }
            }
            ProgressView(value: snapshot.progress)
            if let title = snapshot.currentTitle {
                Text("\(snapshot.currentStage ?? "Working"): \(title)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ReadyJobSection: View {
    let job: ShareJob
    @Bindable var model: JobsModel

    var body: some View {
        let events = model.events(for: job)
        let selectedCount = events.filter { model.isSelected($0) }.count
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                NavigationLink(value: job.id) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(job.displayTitle).font(.headline).lineLimit(2)
                        Text("\(events.count) event\(events.count == 1 ? "" : "s") · \(job.options.destination.displayName)\(job.options.tentative ? " · tentative" : "")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Button(selectedCount == events.count ? "None" : "All") {
                    model.setAll(selectedCount != events.count, in: job)
                }
                .font(.caption)
                .buttonStyle(.bordered)
            }
            ForEach(events) { event in
                EventRowView(event: event, selected: model.isSelected(event)) { model.toggle(event) }
            }
        }
        .padding(.vertical, 4)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { model.dismiss(job) } label: { Label("Dismiss", systemImage: "xmark") }
        }
    }
}

struct EmptyInboxView: View {
    let hasKey: Bool
    let openSettings: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label(hasKey ? "No shared pages yet" : "Add your OpenRouter key", systemImage: hasKey ? "calendar.badge.plus" : "key")
        } description: {
            Text(hasKey
                 ? "In Safari or any app, tap Share, choose Web to ICS, and the event lands here.\nSeveral pages can be shared back to back; the Live Activity shows progress."
                 : "The share extension needs an OpenRouter API key before it can analyze pages.")
        } actions: {
            Button(hasKey ? "Settings" : "Open Settings", action: openSettings)
                .buttonStyle(.borderedProminent)
        }
    }
}
