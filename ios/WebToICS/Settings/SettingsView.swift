import SwiftUI
import WebToICSCore

struct SettingsView: View {
    @State private var model = SettingsModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("OpenRouter API key", text: $model.openRouterKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: model.openRouterKey) { _, _ in model.saveOpenRouterKey() }
                    NavigationLink {
                        ModelPickerView(model: model)
                    } label: {
                        LabeledContent("Model", value: model.modelOptions.first { $0.id == model.model }?.label ?? model.model)
                    }
                } header: {
                    Text("OpenRouter")
                } footer: {
                    if !model.hasOpenRouterKey {
                        Text("Required. Keys stay in the Keychain and are shared with the share extension.")
                    }
                }

                Section("Defaults for new shares") {
                    Toggle("Tentative", isOn: $model.defaultTentative)
                    Picker("Add to", selection: $model.defaultDestination) {
                        ForEach(DestinationKind.allCases) { Text($0.displayName).tag($0) }
                    }
                    NavigationLink {
                        TimeZonePickerView(selection: $model.defaultTimeZoneID)
                    } label: {
                        LabeledContent("Fallback time zone", value: model.defaultTimeZoneID)
                    }
                }

                Section {
                    SecureField("Firecrawl API key (optional)", text: $model.firecrawlKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: model.firecrawlKey) { _, _ in model.saveFirecrawlKey() }
                    Toggle("Use Firecrawl for bare URLs", isOn: $model.firecrawlEnabled)
                        .disabled(!model.hasFirecrawlKey)
                } header: {
                    Text("Bare URLs (Orion, Mail, Notes…)")
                } footer: {
                    Text("Safari shares the page itself. Other apps only pass a link: with Firecrawl on, the page is scraped in the background; otherwise it is rendered in the share sheet for a few seconds, falling back to a plain fetch.")
                }

                GoogleCalendarSection(model: model)

                Section {
                    NavigationLink("Custom prompt rules") {
                        CustomPromptEditor(text: $model.customPrompt)
                    }
                } footer: {
                    Text("Appended under USER PREFERENCES. Leave empty to use the Chrome extension defaults (title style, program details, venue preference).")
                }

                Section("Debug") {
                    Toggle("Short background timeout (60 s)", isOn: $model.debugShortResourceTimeout)
                    LabeledContent("Version", value: Self.versionString)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        model.saveDefaults()
                        dismiss()
                    }
                }
            }
            .onChange(of: model.defaultTentative) { _, _ in model.saveDefaults() }
            .onChange(of: model.defaultDestination) { _, _ in model.saveDefaults() }
            .onChange(of: model.firecrawlEnabled) { _, _ in model.saveDefaults() }
            .onChange(of: model.defaultTimeZoneID) { _, _ in model.saveDefaults() }
            .onChange(of: model.debugShortResourceTimeout) { _, _ in model.saveDefaults() }
            .onDisappear { model.saveDefaults() }
        }
    }

    static var versionString: String {
        let short = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(short) (\(build))"
    }
}

struct CustomPromptEditor: View {
    @Binding var text: String

    var body: some View {
        TextEditor(text: $text)
            .font(.system(.body, design: .monospaced))
            .padding(8)
            .navigationTitle("Custom prompt")
            .navigationBarTitleDisplayMode(.inline)
    }
}

/// Google sign-in plus the two target calendars (confirmed / tentative).
struct GoogleCalendarSection: View {
    @Bindable var model: SettingsModel

    var body: some View {
        Section {
            if !model.googleConfigured {
                Label("No Google OAuth client ID configured. Set GOOGLE_IOS_CLIENT_ID in ios/Config/Secrets.xcconfig and rebuild.",
                      systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.orange)
            } else if let email = model.googleEmail {
                LabeledContent("Account", value: email)
                Picker("Confirmed events", selection: Binding(get: { model.googleConfirmedCalendarID ?? "" }, set: { model.googleConfirmedCalendarID = $0.isEmpty ? nil : $0; model.saveGoogleCalendars() })) {
                    ForEach(model.googleCalendars) { Text($0.summary).tag($0.id) }
                }
                Picker("Tentative events", selection: Binding(get: { model.googleTentativeCalendarID ?? "" }, set: { model.googleTentativeCalendarID = $0.isEmpty ? nil : $0; model.saveGoogleCalendars() })) {
                    ForEach(model.googleCalendars) { Text($0.summary).tag($0.id) }
                }
                Button {
                    Task { await model.loadGoogleCalendars() }
                } label: {
                    HStack {
                        Label("Reload calendars", systemImage: "arrow.clockwise")
                        Spacer()
                        if model.googleBusy { ProgressView() }
                    }
                }
                .disabled(model.googleBusy)
                Button("Sign out", role: .destructive) {
                    Task { await model.googleSignOut() }
                }
            } else {
                Button {
                    Task { await model.googleSignIn() }
                } label: {
                    HStack {
                        Label("Sign in with Google", systemImage: "person.crop.circle.badge.plus")
                        Spacer()
                        if model.googleBusy { ProgressView() }
                    }
                }
                .disabled(model.googleBusy)
            }
            if let error = model.googleError {
                Text(error).font(.caption).foregroundStyle(.red)
            }
        } header: {
            Text("Google Calendar")
        } footer: {
            Text("The Tentative switch on a share decides which of the two calendars receives the event.")
        }
        .task {
            if model.googleEmail != nil, model.googleCalendars.count <= 2 {
                await model.loadGoogleCalendars()
            }
        }
    }
}
