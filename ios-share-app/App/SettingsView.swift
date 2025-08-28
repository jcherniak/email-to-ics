import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var app: AppState

    var body: some View {
        NavigationStack {
            Form {
                Section("OpenRouter") {
                    SecureField("API Key", text: $app.settings.openRouterKey)
                    TextField("Default Model", text: $app.settings.defaultModel)
                }
                Section("Postmark") {
                    SecureField("API Key", text: $app.settings.postmarkKey)
                    TextField("From Email", text: $app.settings.fromEmail).keyboardType(.emailAddress)
                    TextField("To Tentative Email", text: $app.settings.toTentativeEmail).keyboardType(.emailAddress)
                    TextField("To Confirmed Email", text: $app.settings.toConfirmedEmail).keyboardType(.emailAddress)
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { app.saveSettings() }
                }
            }
        }
    }
}

