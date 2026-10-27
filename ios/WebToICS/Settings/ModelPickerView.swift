import SwiftUI
import WebToICSCore

/// Searchable OpenRouter model list: priority aliases first, then everything the API returned.
struct ModelPickerView: View {
    @Bindable var model: SettingsModel
    @State private var query = ""
    @Environment(\.dismiss) private var dismiss

    private var filtered: [ModelOption] {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return model.modelOptions }
        return model.modelOptions.filter { $0.id.localizedCaseInsensitiveContains(trimmed) || $0.label.localizedCaseInsensitiveContains(trimmed) }
    }

    var body: some View {
        List {
            let priority = filtered.filter(\.isPriority)
            let others = filtered.filter { !$0.isPriority }
            if !priority.isEmpty {
                Section("Priority models") { ForEach(priority) { row($0) } }
            }
            if !others.isEmpty {
                Section("All models (\(others.count))") { ForEach(others) { row($0) } }
            }
            if let error = model.modelsError {
                Section { Text(error).foregroundStyle(.red).font(.caption) }
            }
            Section {
                Button {
                    Task { await model.refreshModels() }
                } label: {
                    HStack {
                        Label("Refresh from OpenRouter", systemImage: "arrow.clockwise")
                        Spacer()
                        if model.isRefreshingModels { ProgressView() }
                    }
                }
                .disabled(model.isRefreshingModels)
                if let updated = model.modelsUpdatedAt {
                    Text("Updated \(updated.formatted(.relative(presentation: .named)))").font(.caption).foregroundStyle(.secondary)
                }
            } footer: {
                Text("Aliases like ~openai/gpt-mini-latest always point at the newest model of that family. Custom IDs can be typed in the search field and chosen below.")
            }
            if !query.isEmpty, !model.modelOptions.contains(where: { $0.id == query }) {
                Section("Custom") {
                    Button("Use \"\(query)\"") { choose(query) }
                }
            }
        }
        .searchable(text: $query, prompt: "Search models")
        .navigationTitle("Model")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if model.modelsUpdatedAt == nil || model.modelOptions.count <= ModelCatalog.priorityModels.count + 1 {
                await model.refreshModels()
            }
        }
    }

    private func row(_ option: ModelOption) -> some View {
        Button { choose(option.id) } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(option.label)
                    Text(option.id).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                if option.id == model.model { Image(systemName: "checkmark").foregroundStyle(.tint) }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func choose(_ id: String) {
        model.model = id
        model.saveModel()
        model.modelOptions = ModelCatalog.options(including: id, from: model.modelOptions)
        dismiss()
    }
}

struct TimeZonePickerView: View {
    @Binding var selection: String
    @State private var query = ""
    @Environment(\.dismiss) private var dismiss

    private var identifiers: [String] {
        let all = TimeZone.knownTimeZoneIdentifiers
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return all }
        return all.filter { $0.localizedCaseInsensitiveContains(trimmed) }
    }

    var body: some View {
        List(identifiers, id: \.self) { id in
            Button {
                selection = id
                dismiss()
            } label: {
                HStack {
                    Text(id.replacingOccurrences(of: "_", with: " "))
                    Spacer()
                    if id == selection { Image(systemName: "checkmark").foregroundStyle(.tint) }
                }
            }
            .buttonStyle(.plain)
        }
        .searchable(text: $query, prompt: "Search time zones")
        .navigationTitle("Default time zone")
        .navigationBarTitleDisplayMode(.inline)
    }
}
