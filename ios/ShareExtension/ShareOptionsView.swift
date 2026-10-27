import SwiftUI
import WebToICSCore

/// The share sheet: special instructions, tentative, model, destination and Go.
struct ShareOptionsView: View {
    @Bindable var model: ShareModel
    var onSubmit: () -> Void
    var onCancel: () -> Void
    var onOpenApp: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(model.pageTitle)
                            .font(.headline)
                            .lineLimit(2)
                        if let subtitle = model.pageSubtitle {
                            Text(subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                                .truncationMode(.middle)
                        }
                        if let status = model.captureStatus {
                            HStack(spacing: 6) {
                                if model.captureResult == nil { ProgressView().controlSize(.small) }
                                Text(status).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Section("Special instructions") {
                    TextField("e.g. Only the May 30 performance", text: $model.instructions, axis: .vertical)
                        .lineLimit(2...6)
                }

                Section {
                    Toggle("Tentative", isOn: $model.tentative)
                    Picker("Model", selection: $model.model) {
                        ForEach(model.modelOptions) { option in
                            Text(option.label).tag(option.id)
                        }
                    }
                    Picker("Add to", selection: $model.destination) {
                        ForEach(DestinationKind.allCases) { kind in
                            Text(kind.displayName).tag(kind)
                        }
                    }
                    if model.destination == .googleCalendar && !model.googleConfigured {
                        Label("Sign in to Google in the app first", systemImage: "exclamationmark.triangle")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }

                if case .failed(let message) = model.phase {
                    Section {
                        Label(message, systemImage: "xmark.octagon")
                            .foregroundStyle(.red)
                        if !model.hasOpenRouterKey {
                            Button("Open Web to ICS settings", action: onOpenApp)
                        }
                    }
                }

                if case .queued(let openApp) = model.phase {
                    Section {
                        Label(openApp ? "Queued. Opening Web to ICS…" : "Queued. Watch the Live Activity for progress.",
                              systemImage: "checkmark.circle")
                            .foregroundStyle(.green)
                    }
                }
            }
            .navigationTitle("Web to ICS")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(action: onSubmit) {
                        switch model.phase {
                        case .capturing, .submitting: ProgressView()
                        default: Text("Add")
                        }
                    }
                    .disabled(!model.canSubmit)
                }
            }
        }
    }
}
